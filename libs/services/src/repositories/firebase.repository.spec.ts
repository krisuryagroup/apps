import { describe, it, expect, beforeEach } from 'vitest';
import { FirebaseRepository } from './firebase.repository';

describe('FirebaseRepository', () => {
  let repository: FirebaseRepository;
  let mockFirestore: any;
  let mockStorage: any;
  let mockAuth: any;

  beforeEach(() => {
    mockFirestore = { name: 'mockFirestore' };
    mockStorage = { name: 'mockStorage' };
    mockAuth = { name: 'mockAuth' };

    repository = new FirebaseRepository(mockFirestore, mockStorage, mockAuth);
  });

  describe('Initialization', () => {
    it('should initialize with Firebase instances', () => {
      expect(repository).toBeDefined();
    });

    it('should store Firestore instance', () => {
      expect((repository as any).firestoreInstance).toBe(mockFirestore);
    });

    it('should store Storage instance', () => {
      expect((repository as any).storageInstance).toBe(mockStorage);
    });

    it('should store Auth instance', () => {
      expect((repository as any).authInstance).toBe(mockAuth);
    });
  });

  describe('Getters', () => {
    it('should return Firestore instance', () => {
      expect(repository.firestore).toBe(mockFirestore);
    });

    it('should return Storage instance', () => {
      expect(repository.firebaseStorage).toBe(mockStorage);
    });

    it('should return Auth instance', () => {
      expect(repository.firebaseAuth).toBe(mockAuth);
    });
  });

  describe('Multiple instances', () => {
    it('should allow multiple repository instances', () => {
      const repo1 = new FirebaseRepository(mockFirestore, mockStorage, mockAuth);
      const repo2 = new FirebaseRepository(
        { name: 'firestore2' } as any, 
        { name: 'storage2' } as any, 
        { name: 'auth2' } as any
      );

      expect(repo1.firestore).not.toBe(repo2.firestore);
    });
  });

  describe('Immutability', () => {
    it('should not allow modifying returned instances', () => {
      const firestore = repository.firestore;
      const storage = repository.firebaseStorage;
      const auth = repository.firebaseAuth;

      expect(firestore).toBe(repository.firestore);
      expect(storage).toBe(repository.firebaseStorage);
      expect(auth).toBe(repository.firebaseAuth);
    });
  });
});
