import { Injectable } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { Storage } from '@angular/fire/storage';
import { Auth } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class FirebaseRepository {
  
  constructor(
    private firestoreInstance: Firestore,
    private storageInstance: Storage,
    private authInstance: Auth
  ) {}

  get firestore() { 
    return this.firestoreInstance;
  }
  
  get firebaseStorage() { 
    return this.storageInstance;
  }

  get firebaseAuth() {
    return this.authInstance;
  }
}
