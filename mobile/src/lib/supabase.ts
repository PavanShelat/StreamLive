// src/lib/supabase.ts
// Supabase client singleton — configured for React Native with AsyncStorage session persistence, falling back to localStorage on Web

import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/config'

// Fallback to localStorage on Web environment
const authStorage = Platform.OS === 'web' 
  ? {
      getItem: (key: string) => {
        if (typeof window !== 'undefined') return Promise.resolve(window.localStorage.getItem(key))
        return Promise.resolve(null)
      },
      setItem: (key: string, value: string) => { 
        if (typeof window !== 'undefined') window.localStorage.setItem(key, value)
        return Promise.resolve() 
      },
      removeItem: (key: string) => { 
        if (typeof window !== 'undefined') window.localStorage.removeItem(key)
        return Promise.resolve() 
      }
    }
  : AsyncStorage

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

