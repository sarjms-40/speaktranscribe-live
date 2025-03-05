
export interface CallRecord {
  id?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  transcript: string;
  agentId?: string; // For future authentication integration
  callReference?: string; // Optional reference ID
  tags?: string[]; // Optional tags for categorization
  notes?: string; // Optional notes about the call
}
