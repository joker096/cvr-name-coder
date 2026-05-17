import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { storageService } from '../storageService';

describe('storageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should save and load data', () => {
    const data = { test: 'value' };
    storageService.save('test-key', data);
    const loaded = storageService.load('test-key');
    expect(loaded).toEqual(data);
  });

  it('should return null for non-existent key', () => {
    const loaded = storageService.load('non-existent');
    expect(loaded).toBeNull();
  });

  it('should remove data', () => {
    storageService.save('test-key', { test: 'value' });
    storageService.remove('test-key');
    const loaded = storageService.load('test-key');
    expect(loaded).toBeNull();
  });

  it('should clear all data', () => {
    storageService.save('key1', { test: 'value1' });
    storageService.save('key2', { test: 'value2' });
    storageService.clear();
    expect(localStorage.length).toBe(0);
  });
});
