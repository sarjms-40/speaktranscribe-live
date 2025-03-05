
import { CallRecord } from "@/models/CallRecord";

// Using IndexedDB for client-side storage (HIPAA-compliant as it's local only)
class DbService {
  private dbName = "callCenterDB";
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  // Initialize the database
  async init(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error("Database error:", (event.target as IDBRequest).error);
        reject(false);
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log("Database opened successfully");
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store for call records
        if (!db.objectStoreNames.contains("callRecords")) {
          const store = db.createObjectStore("callRecords", { keyPath: "id", autoIncrement: true });
          // Create indexes for common queries
          store.createIndex("startTime", "startTime", { unique: false });
          store.createIndex("agentId", "agentId", { unique: false });
        }
      };
    });
  }

  // Save a new call record
  async saveCallRecord(record: CallRecord): Promise<string | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      // Generate a unique ID if not provided
      if (!record.id) {
        record.id = crypto.randomUUID();
      }
      
      const transaction = this.db.transaction(["callRecords"], "readwrite");
      
      transaction.onerror = (event) => {
        console.error("Transaction error:", (event.target as IDBRequest).error);
        reject(null);
      };
      
      const store = transaction.objectStore("callRecords");
      const request = store.add(record);
      
      request.onsuccess = () => {
        resolve(record.id as string);
      };
      
      request.onerror = (event) => {
        console.error("Error saving record:", (event.target as IDBRequest).error);
        reject(null);
      };
    });
  }

  // Get all call records
  async getAllCallRecords(): Promise<CallRecord[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }
      
      const transaction = this.db.transaction(["callRecords"], "readonly");
      const store = transaction.objectStore("callRecords");
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error("Error getting records:", (event.target as IDBRequest).error);
        reject([]);
      };
    });
  }

  // Get a specific call record by ID
  async getCallRecordById(id: string): Promise<CallRecord | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }
      
      const transaction = this.db.transaction(["callRecords"], "readonly");
      const store = transaction.objectStore("callRecords");
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = (event) => {
        console.error("Error getting record:", (event.target as IDBRequest).error);
        reject(null);
      };
    });
  }

  // Delete a call record
  async deleteCallRecord(id: string): Promise<boolean> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(false);
        return;
      }
      
      const transaction = this.db.transaction(["callRecords"], "readwrite");
      const store = transaction.objectStore("callRecords");
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error("Error deleting record:", (event.target as IDBRequest).error);
        reject(false);
      };
    });
  }
}

// Create a singleton instance
const dbService = new DbService();

export default dbService;
