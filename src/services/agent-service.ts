import { v4 as uuidv4 } from 'uuid';
import { mkdir, readFile, writeFile, copyFile, readdir, stat, access } from 'fs/promises';
import { resolve, join, basename } from 'path';
import { existsSync } from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { 
  Task, 
  TaskType, 
  TaskStatus, 
  TaskPhase, 
  TaskConfiguration, 
  ArtifactsUrl,
  TaskResponse,
  taskToResponse,
  ArtifactType,
  UploadedArtifacts
} from '@/types';
import { settings } from '@/lib/config';
import { WebSocketManager } from './websocket-manager';
// import { OpenCode } from '@opencode-ai/sdk'; // Will implement SDK integration

const OPENCODE_TIMEOUT_SECONDS = 14400; // 4 hours
const APP_HASH_LENGTH = 12;

export class AgentService {
  private tasks: Map<string, Task> = new Map();
  private taskLocks: Map<string, Promise<void>> = new Map();
  private runningProcesses: Map<string, ChildProcess> = new Map();
  private backgroundTasks: Set<Promise<void>> = new Set();
  private websocketManager: WebSocketManager;

  constructor(websocketManager: WebSocketManager) {
    this.websocketManager = websocketManager;
  }

  async createTask(
    taskType: TaskType,
    configuration: TaskConfiguration,
    sessionId: string,
    artifactsUrl?: ArtifactsUrl
  ): Promise<Task> {
    const taskId = uuidv4();
    const now = new Date();
    
    // Create session path
    const sessionPath = resolve(settings.sessionRoot, taskId);
    await mkdir(sessionPath, { recursive: true });

    const task: Task = {
      id: taskId,
      task_type: taskType,
      status: TaskStatus.PENDING,
      current_phase: TaskPhase.PLANNING,
      current_activity: undefined,
      configuration,
      session_path: sessionPath,
      session_id: sessionId,
      created_at: now,
      updated_at: now,
      completed_at: undefined,
      artifacts_url: artifactsUrl,
      uploaded_artifacts: {} as Record<ArtifactType, UploadedArtifacts>,
      error: undefined,
      debug_logs: []
    };

    this.tasks.set(taskId, task);
    await this.sendDebug(taskId, `Task created: ${taskId} (${taskType})`);
    
    return task;
  }

  async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    try {
      // Update task status
      task.status = TaskStatus.INITIALIZING;
      task.updated_at = new Date();
      await this.sendDebug(taskId, 'Task execution started');

      // Create OpenCode configuration
      await this.createOpencodeConfig(task);

      // Execute the OpenCode pipeline
      task.status = TaskStatus.RUNNING;
      task.updated_at = new Date();
      
      const [success, errorDetail] = await this.executeOpencodePipeline(task);
      
      if (success) {
        task.status = TaskStatus.COMPLETED;
        task.completed_at = new Date();
        await this.sendDebug(taskId, 'Task completed successfully');
      } else {
        task.status = TaskStatus.FAILED;
        task.error = errorDetail;
        task.completed_at = new Date();
        await this.sendDebug(taskId, `Task failed: ${errorDetail}`, 'ERROR');
      }
    } catch (error) {
      task.status = TaskStatus.FAILED;
      task.error = error instanceof Error ? error.message : String(error);
      task.completed_at = new Date();
      await this.sendDebug(taskId, `Task execution error: ${task.error}`, 'ERROR');
    } finally {
      task.updated_at = new Date();
      this.unregisterProcess(taskId);
    }
  }

  private async executeOpencodePipeline(task: Task): Promise<[boolean, string]> {
    await this.sendDebug(task.id, `Starting OpenCode pipeline for task ${task.id}`);
    
    try {
      // Check if session directory exists
      if (!existsSync(task.session_path)) {
        return [false, `Session directory does not exist: ${task.session_path}`];
      }

      // Check if OpenCode command is available
      if (!settings.opencodeAvailable) {
        return [false, `OpenCode command not found in PATH: ${settings.opencodeCommand}`];
      }

      // Pre-create OpenCode session directory structure
      await this.sendDebug(task.id, `Pre-creating OpenCode session for session_id: ${task.session_id}`);
      await this.createOpencodeSession(task.session_id, task.session_path, task.configuration.app_url);
      await this.sendDebug(task.id, `OpenCode session ${task.session_id} ready for use`);

      // Use build agent for orchestration
      const primaryAgent = 'build';
      await this.sendDebug(task.id, `Using primary agent: ${primaryAgent}`);

      // Create task-specific instructions using external prompt files
      const appUrl = task.configuration.app_url;
      
      const promptFiles: Record<TaskType, string> = {
        [TaskType.COMPLETE]: '.opencode/prompts/tasks/complete-testing-workflow.md',
        [TaskType.PLAN]: '.opencode/prompts/tasks/test-planning.md',
        [TaskType.GENERATE]: '.opencode/prompts/tasks/test-generation.md',
        [TaskType.FIX]: '.opencode/prompts/tasks/test-fixing.md',
        [TaskType.RUN]: '.opencode/prompts/tasks/test-running.md',
        [TaskType.CUSTOM]: '.opencode/prompts/tasks/custom-task.md'
      };

      let instructions = '';
      const promptFile = promptFiles[task.task_type];
      if (promptFile && existsSync(promptFile)) {
        const promptContent = await readFile(promptFile, 'utf-8');
        instructions = promptContent.replace(/\{\{app_url\}\}/g, appUrl);
      } else {
        instructions = `Test the application at ${appUrl}`;
      }

      // Add custom instructions if provided
      if (task.configuration.instructions) {
        instructions += `\n\nAdditional instructions: ${task.configuration.instructions}`;
      }

      // TODO: Replace with OpenCode SDK calls
      // For now, we'll use subprocess as fallback until SDK integration is complete
      const cmdArgs = [
        settings.opencodeCommand,
        'run',
        '--print-logs',
        '--log-level', settings.opencodeLogLevel,
        '--session', task.session_id,
        '--agent', primaryAgent,
        instructions
      ];

      await this.sendDebug(task.id, `Working directory: ${task.session_path}`, 'INFO', primaryAgent);
      await this.sendDebug(task.id, 'Starting OpenCode subprocess...', 'INFO', primaryAgent);

      return await this.executeSubprocess(task, cmdArgs, task.session_path);

    } catch (error) {
      const errorMsg = `Pipeline execution exception: ${error instanceof Error ? error.message : String(error)}`;
      return [false, errorMsg];
    }
  }

  private async executeSubprocess(task: Task, cmdArgs: string[], cwd: string): Promise<[boolean, string]> {
    return new Promise((resolve) => {
      const childProcess = spawn(cmdArgs[0], cmdArgs.slice(1), {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      this.registerProcess(task.id, childProcess);

      let stdout = '';
      let stderr = '';
      let sessionIdleDetected = false;

      childProcess.stdout?.on('data', async (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        const lines = text.split('\n').filter((line: string) => line.trim());
        for (const line of lines) {
          await this.sendDebug(task.id, `[STDOUT] ${line}`, 'INFO', 'build');
        }
      });

      childProcess.stderr?.on('data', async (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        const lines = text.split('\n').filter((line: string) => line.trim());
        for (const line of lines) {
          await this.sendDebug(task.id, `[STDERR] ${line}`, 'WARNING', 'build');
          
          // Check for session idle detection
          if (line.includes('Session has been idle')) {
            sessionIdleDetected = true;
            await this.sendDebug(task.id, 'Session idle detected - terminating process gracefully', 'INFO', 'build');
            try {
              childProcess.kill('SIGTERM');
              setTimeout(() => childProcess.kill('SIGKILL'), 3000);
            } catch (e) {
              await this.sendDebug(task.id, `Failed to terminate process: ${e}`, 'WARNING', 'build');
            }
          }
        }
      });

      childProcess.on('close', async (code: number | null) => {
        this.unregisterProcess(task.id);
        
        if (sessionIdleDetected || code === 0) {
          await this.sendDebug(task.id, `OpenCode process completed (exit code: ${code})`, 'INFO', 'build');
          resolve([true, 'Process completed successfully']);
        } else {
          await this.sendDebug(task.id, `OpenCode process failed (exit code: ${code})`, 'ERROR', 'build');
          resolve([false, `Process failed with exit code ${code}. STDERR: ${stderr}`]);
        }
      });

      childProcess.on('error', async (error: Error) => {
        this.unregisterProcess(task.id);
        await this.sendDebug(task.id, `Process error: ${error.message}`, 'ERROR', 'build');
        resolve([false, `Process error: ${error.message}`]);
      });

      // Set timeout
      setTimeout(() => {
        if (!childProcess.killed) {
          childProcess.kill('SIGTERM');
          setTimeout(() => childProcess.kill('SIGKILL'), 3000);
          resolve([false, 'Process timeout']);
        }
      }, OPENCODE_TIMEOUT_SECONDS * 1000);
    });
  }

  private async createOpencodeConfig(task: Task): Promise<void> {
    const sessionPath = resolve(task.session_path);
    
    try {
      // Copy opencode.json from config directory to session
      const sessionConfigPath = join(sessionPath, 'opencode.json');
      
      if (existsSync(settings.opencodeConfigPath)) {
        await copyFile(settings.opencodeConfigPath, sessionConfigPath);
      } else {
        console.warn(`OpenCode config not found at ${settings.opencodeConfigPath}`);
      }

      // Copy .opencode directory from configured path
      if (existsSync(settings.opencodeDir)) {
        const sessionOpencodeDir = join(sessionPath, '.opencode');
        await this.safeCopyTree(settings.opencodeDir, sessionOpencodeDir);
      } else {
        console.log(`No .opencode directory found at ${settings.opencodeDir} - using OpenCode defaults`);
      }
    } catch (error) {
      throw new Error(`Failed to create session configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createOpencodeSession(sessionId: string, workingDir: string, appUrl: string): Promise<void> {
    try {
      // Get project ID from git repository
      const gitProjectId = await this.getGitProjectId(workingDir);
      
      if (!gitProjectId) {
        throw new Error(`No git project ID found in ${workingDir}. Git repository must be properly initialized.`);
      }

      const projectId = gitProjectId;
      await this.sendDebug(sessionId, `Using git project ID: ${projectId} (from ${workingDir})`);

      // Dynamically detect OpenCode storage location
      const opencodeStorage = this.detectOpencodeStoragePath();
      await this.sendDebug(sessionId, `Using OpenCode storage path: ${opencodeStorage}`);

      // Create session directory structure
      const sessionBaseDir = join(opencodeStorage, 'session');
      const projectSessionDir = join(sessionBaseDir, projectId);

      await mkdir(projectSessionDir, { recursive: true });

      // Create session file following OpenCode's session structure
      const currentTime = Date.now();
      const sessionData = {
        id: sessionId,
        version: '0.6.4',
        projectID: projectId,
        directory: workingDir.replace(/\\/g, '/'),
        title: `User Session - ${sessionId}`,
        time: {
          created: currentTime,
          updated: currentTime
        }
      };

      const sessionFile = join(projectSessionDir, `${sessionId}.json`);
      await writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
      
      await this.sendDebug(sessionId, `Session file created: ${sessionFile}`);
      
    } catch (error) {
      throw new Error(`Failed to create OpenCode session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getGitProjectId(workingDir: string): Promise<string | null> {
    try {
      const { spawn } = require('child_process');
      
      return new Promise((resolve) => {
        const gitProcess = spawn('git', ['rev-parse', '--show-toplevel'], {
          cwd: workingDir,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        gitProcess.stdout?.on('data', (data: Buffer) => {
          output += data.toString();
        });

        gitProcess.on('close', (code: number) => {
          if (code === 0 && output.trim()) {
            const repoPath = output.trim();
            const repoName = basename(repoPath);
            resolve(repoName);
          } else {
            resolve(null);
          }
        });

        gitProcess.on('error', () => resolve(null));
      });
    } catch {
      return null;
    }
  }

  private detectOpencodeStoragePath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    return join(homeDir, '.opencode');
  }

  private async safeCopyTree(src: string, dest: string): Promise<void> {
    await mkdir(dest, { recursive: true });
    
    const entries = await readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.safeCopyTree(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
    }
  }

  private registerProcess(taskId: string, process: ChildProcess): void {
    this.runningProcesses.set(taskId, process);
  }

  private unregisterProcess(taskId: string): void {
    this.runningProcesses.delete(taskId);
  }

  private async sendDebug(
    taskId: string, 
    message: string, 
    level: string = 'INFO', 
    agent?: string
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task) {
      task.debug_logs.push(`[${new Date().toISOString()}] [${level}] ${message}`);
      task.updated_at = new Date();
    }

    // Send via WebSocket if available
    try {
      await this.websocketManager.sendDebugMessage({
        timestamp: new Date(),
        level,
        message,
        task_id: taskId,
        agent
      });
    } catch (error) {
      console.warn('Failed to send debug message via WebSocket:', error);
    }
  }

  // Public methods for API
  async getTask(taskId: string): Promise<Task | undefined> {
    return this.tasks.get(taskId);
  }

  async getTaskResponse(taskId: string): Promise<TaskResponse | undefined> {
    const task = this.tasks.get(taskId);
    return task ? taskToResponse(task) : undefined;
  }

  async getAllTasks(): Promise<TaskResponse[]> {
    return Array.from(this.tasks.values()).map(taskToResponse);
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const process = this.runningProcesses.get(taskId);
    if (process && !process.killed) {
      process.kill('SIGTERM');
      setTimeout(() => process.kill('SIGKILL'), 3000);
    }

    task.status = TaskStatus.CANCELLED;
    task.completed_at = new Date();
    task.updated_at = new Date();
    await this.sendDebug(taskId, 'Task cancelled by user');
    
    return true;
  }

  async shutdownAllProcesses(): Promise<void> {
    const promises = Array.from(this.runningProcesses.entries()).map(async ([taskId, process]) => {
      if (!process.killed) {
        try {
          process.kill('SIGTERM');
          setTimeout(() => process.kill('SIGKILL'), 3000);
          await this.sendDebug(taskId, 'Process terminated during shutdown');
        } catch (error) {
          console.warn(`Failed to terminate process for task ${taskId}:`, error);
        }
      }
    });

    await Promise.all(promises);
    this.runningProcesses.clear();
  }
}

// Global instance
let agentServiceInstance: AgentService | null = null;

export function getAgentService(websocketManager: WebSocketManager): AgentService {
  if (!agentServiceInstance) {
    agentServiceInstance = new AgentService(websocketManager);
  }
  return agentServiceInstance;
}