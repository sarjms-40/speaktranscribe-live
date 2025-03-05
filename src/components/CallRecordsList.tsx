
import React, { useState } from "react";
import { CallRecord } from "@/models/CallRecord";
import { formatDistanceToNow, format } from "date-fns";
import { Trash2, Clock, FileText, ChevronDown, ChevronUp } from "lucide-react";

interface CallRecordsListProps {
  records: CallRecord[];
  onDelete: (id: string) => void;
}

const CallRecordsList: React.FC<CallRecordsListProps> = ({ records, onDelete }) => {
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  const toggleRecord = (id: string) => {
    if (expandedRecordId === id) {
      setExpandedRecordId(null);
    } else {
      setExpandedRecordId(id);
    }
  };

  if (records.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        No saved call records found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium mb-4">Saved Call Records</h3>
      
      {records.map((record) => {
        const isExpanded = expandedRecordId === record.id;
        
        return (
          <div 
            key={record.id} 
            className="bg-card border border-border rounded-md overflow-hidden"
          >
            <div 
              className="p-4 cursor-pointer hover:bg-muted/50 flex justify-between items-center"
              onClick={() => toggleRecord(record.id as string)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {record.startTime instanceof Date 
                      ? format(record.startTime, 'MMM d, yyyy • h:mm a')
                      : format(new Date(record.startTime), 'MMM d, yyyy • h:mm a')}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {record.duration ? `${record.duration}s` : 'Unknown duration'}
                  </div>
                  
                  <div>
                    {record.startTime instanceof Date 
                      ? formatDistanceToNow(record.startTime, { addSuffix: true })
                      : formatDistanceToNow(new Date(record.startTime), { addSuffix: true })}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (record.id) onDelete(record.id);
                  }}
                  className="p-1 hover:bg-destructive/10 rounded text-destructive"
                  aria-label="Delete record"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>
            
            {isExpanded && (
              <div className="p-4 border-t border-border bg-muted/20">
                <div className="text-xs uppercase font-medium text-muted-foreground mb-2">
                  Transcript
                </div>
                <div className="whitespace-pre-wrap break-words max-h-60 overflow-y-auto bg-background p-3 rounded-md text-sm">
                  {record.transcript || "No transcript available"}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CallRecordsList;
