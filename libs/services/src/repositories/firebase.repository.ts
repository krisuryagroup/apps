import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { Storage } from '@angular/fire/storage';
import { Auth } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class FirebaseRepository {
  private firestoreInstance = inject(Firestore);
  private storageInstance = inject(Storage);
  private authInstance = inject(Auth);

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
