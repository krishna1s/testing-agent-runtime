// Core enums and types
export enum TaskType {
  COMPLETE = 'complete',
  PLAN = 'plan',
  GENERATE = 'generate',
  FIX = 'fix',
  RUN = 'run',
  CUSTOM = 'custom'
}

export enum TaskStatus {
  PENDING = 'pending',
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum TaskPhase {
  PLANNING = 'planning',
  GENERATING_TESTS = 'generating_tests',
  FIXING_TESTS = 'fixing_tests',
  RUNNING_TESTS = 'running_tests'
}

export enum ArtifactType {
  PLAN_PHASE = 'plan_phase',
  GENERATION_PHASE = 'generation_phase',
  FIXING_PHASE = 'fixing_phase',
  COMPLETE = 'complete'
}

export enum SignInMethod {
  NONE = 'none',
  USERNAME_PASSWORD = 'username-password'
}

// Interfaces
export interface SignInDetails {
  method: SignInMethod;
  username?: string;
  password?: string;
}

export interface ArtifactsUrl {
  /** SAS URL for Azure Storage container with write permissions */
  sas_url: string;
}

export interface UploadedArtifacts {
  /** Direct URL to the uploaded file in Azure Storage */
  blob_url: string;
  /** Name of the uploaded blob/file */
  blob_name: string;
  /** Timestamp when upload completed */
  uploaded_at: Date;
  /** Size of uploaded file in bytes */
  file_size: number;
}

export interface TaskConfiguration {
  /** Target application URL to test */
  app_url: string;
  /** Sign-in details if authentication required */
  sign_in?: SignInDetails;
  /** Additional instructions for the agent */
  instructions?: string;
}

export interface TaskRequest {
  /** Type of task to execute */
  task_type: TaskType;
  /** Task configuration */
  configuration: TaskConfiguration;
  /** OpenCode session ID to continue or create */
  session_id: string;
  /** Azure Storage SAS URL for artifacts upload */
  artifacts_url?: ArtifactsUrl;
}

export interface SessionFile {
  /** File name */
  name: string;
  /** Relative path from session root */
  path: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  modified: Date;
  /** File type (file/directory) */
  type: string;
}

// Core/Internal Models
export interface Task {
  /** Unique task identifier */
  id: string;
  /** Type of task */
  task_type: TaskType;
  /** Current task status */
  status: TaskStatus;
  /** Current execution phase */
  current_phase: TaskPhase;
  /** Current user-friendly activity description */
  current_activity?: string;
  /** Task configuration */
  configuration: TaskConfiguration;
  /** Path to task session directory */
  session_path: string;
  /** OpenCode session ID for multi-agent tasks */
  session_id: string;
  /** Task creation timestamp */
  created_at: Date;
  /** Last update timestamp */
  updated_at: Date;
  /** Task completion timestamp */
  completed_at?: Date;
  /** Azure Storage SAS URL for artifacts */
  artifacts_url?: ArtifactsUrl;
  /** Details of uploaded artifacts by phase */
  uploaded_artifacts: Record<ArtifactType, UploadedArtifacts>;
  /** Error message if task failed */
  error?: string;
  /** Real-time debug messages */
  debug_logs: string[];
}

// API Response Models
export interface TaskResponse {
  /** Unique task identifier */
  id: string;
  /** Type of task */
  task_type: TaskType;
  /** Current task status */
  status: TaskStatus;
  /** Current execution phase */
  current_phase: TaskPhase;
  /** Current user-friendly activity description */
  current_activity?: string;
  /** Task configuration */
  configuration: TaskConfiguration;
  /** Path to task session directory */
  session_path: string;
  /** OpenCode session ID for multi-agent tasks */
  session_id: string;
  /** Task creation timestamp */
  created_at: Date;
  /** Last update timestamp */
  updated_at: Date;
  /** Task completion timestamp */
  completed_at?: Date;
  /** Azure Storage SAS URL for artifacts */
  artifacts_url?: ArtifactsUrl;
  /** Details of uploaded artifacts by phase */
  uploaded_artifacts: Record<ArtifactType, UploadedArtifacts>;
  /** Error message if task failed */
  error?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: Date;
  version: string;
  opencode_available: boolean;
}

export interface TaskLogsResponse {
  /** Task identifier */
  task_id: string;
  /** Real-time debug messages */
  debug_logs: string[];
  /** Total number of debug entries */
  total_debug_entries: number;
}

export interface TaskListResponse {
  /** List of tasks */
  tasks: TaskResponse[];
  /** Total number of tasks */
  total_tasks: number;
}

export interface DebugMessage {
  /** Message timestamp */
  timestamp: Date;
  /** Log level (DEBUG, INFO, ERROR) */
  level: string;
  /** Debug message content */
  message: string;
  /** Associated task ID */
  task_id: string;
  /** Agent name if applicable */
  agent?: string;
}

export interface StreamEvent {
  /** Event type (debug, status, error, complete) */
  event_type: string;
  /** Event data */
  data: Record<string, any>;
}

// Auth Models
export interface AuthLoginResponse {
  /** Device code for GitHub authentication */
  device_code?: string;
  /** URL to complete authentication */
  verification_url?: string;
}

export interface AuthStatusResponse {
  /** Whether user is authenticated */
  authenticated: boolean;
  /** GitHub Copilot refresh token */
  refreshToken?: string;
}

export interface AuthInjectTokenRequest {
  /** GitHub Copilot refresh token to inject */
  refreshToken: string;
}

// Cleanup API Models
export interface CleanupFailures {
  /** Paths of sessions that failed to delete */
  failed_session_deletions: string[];
  /** Paths of app directories that failed to delete */
  failed_app_deletions: string[];
  /** Whether OpenCode storage deletion failed */
  opencode_deletion_failed: boolean;
  /** Total number of failures */
  total_failures: number;
}

export interface CleanupResponse {
  /** Cleanup result message */
  message: string;
  /** Number of sessions successfully deleted */
  deleted_sessions: number;
  /** Number of in-memory tasks cleared */
  deleted_tasks: number;
  /** Whether OpenCode storage was deleted */
  deleted_opencode_storage: boolean;
  /** Total session directories found before cleanup */
  total_session_directories: number;
  /** Whether cleanup completed without failures */
  success: boolean;
  /** Failure details if any occurred */
  failures?: CleanupFailures;
}

// Session API Models
export interface SessionListResponse {
  /** List of available session IDs */
  sessions: string[];
  /** Total number of sessions */
  total_sessions: number;
}

export interface SessionFilesResponse {
  /** List of files in the session */
  files: SessionFile[];
  /** Total number of files */
  total_files: number;
  /** Session identifier */
  session_id: string;
}

export interface UploadRequest {
  /** Azure Storage SAS URL with write permissions */
  sas_url: string;
}

// Utility function to convert Task to TaskResponse
export function taskToResponse(task: Task): TaskResponse {
  return {
    id: task.id,
    task_type: task.task_type,
    status: task.status,
    current_phase: task.current_phase,
    current_activity: task.current_activity,
    configuration: task.configuration,
    session_path: task.session_path,
    session_id: task.session_id,
    created_at: task.created_at,
    updated_at: task.updated_at,
    completed_at: task.completed_at,
    artifacts_url: task.artifacts_url,
    uploaded_artifacts: task.uploaded_artifacts,
    error: task.error
  };
}