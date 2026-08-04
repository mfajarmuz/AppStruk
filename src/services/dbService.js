import { supabase } from '../lib/supabase';

// Hybrid Database Storage Manager (Supabase Cloud + Local Electron Storage Fallback)
export const dbService = {
  // Save Data to Supabase Cloud Database & Local Storage
  async saveData(key, data) {
    // 1. Local Electron file backup
    if (window.electronAPI) {
      try {
        await window.electronAPI.saveData(key, data);
      } catch (err) {
        console.warn('Local electron backup save warning:', err);
      }
    } else {
      localStorage.setItem(`thermal_struk_${key}`, JSON.stringify(data));
    }

    // 2. Supabase Cloud Database Upsert
    try {
      const { error } = await supabase
        .from('app_data')
        .upsert({ key: key, value: data, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('app_data')) {
          console.info(`💡 Tips: Silakan jalankan SQL 'CREATE TABLE app_data (key text primary key, value jsonb, updated_at timestamptz);' di Supabase SQL Editor.`);
        } else {
          console.warn(`Supabase cloud save status for '${key}':`, error.message);
        }
      } else {
        console.log(`☁️ Supabase Cloud DB: Berhasil menyimpan data '${key}'`);
      }
    } catch (err) {
      console.warn(`Supabase sync warning for '${key}':`, err);
    }
  },

  // Load Data from Supabase Cloud Database (with Local Fallback)
  async loadData(key, defaultValue = null) {
    let cloudData = null;

    // 1. Try Loading from Supabase Cloud DB
    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('value')
        .eq('key', key)
        .single();

      if (!error && data && data.value) {
        cloudData = data.value;
        console.log(`☁️ Loaded '${key}' from Supabase Cloud Database.`);
      }
    } catch (err) {
      console.warn(`Supabase cloud load fallback for '${key}':`, err);
    }

    if (cloudData !== null) return cloudData;

    // 2. Local Fallback if offline or not in cloud yet
    if (window.electronAPI) {
      try {
        const localData = await window.electronAPI.loadData(key);
        if (localData !== null && localData !== undefined) return localData;
      } catch (err) {
        console.warn('Local electron load warning:', err);
      }
    } else {
      const stored = localStorage.getItem(`thermal_struk_${key}`);
      if (stored) {
        try { return JSON.parse(stored); } catch (e) {}
      }
    }

    return defaultValue;
  }
};
