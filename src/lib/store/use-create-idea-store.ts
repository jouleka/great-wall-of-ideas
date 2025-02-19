'use client'

import { create } from 'zustand'
import { CategoryWithSubcategories } from '@/lib/types/category'
import { categoryService } from '@/lib/services/category-service'
import { IdeaStatus } from '@/lib/types/database'
import { toast } from 'sonner'

interface FormState {
  title: string
  description: string
  target_audience: string
  category_id: string
  subcategory_id?: string
  tags: string
  is_anonymous: boolean
  is_private: boolean
  status: IdeaStatus
}

interface CreateIdeaState {
  isOpen: boolean
  isFullscreen: boolean
  isSubmitting: boolean
  isLoadingCategories: boolean
  categories: CategoryWithSubcategories[]
  selectedCategory: CategoryWithSubcategories | null
  formState: FormState
  error: Error | null
}

interface CreateIdeaActions {
  setOpen: (open: boolean) => void
  toggleFullscreen: () => void
  setSubmitting: (submitting: boolean) => void
  loadCategories: () => Promise<void>
  setSelectedCategory: (category: CategoryWithSubcategories | null) => void
  updateFormField: <K extends keyof FormState>(field: K, value: FormState[K]) => void
  resetForm: () => void
  loadDraft: () => void
  saveDraft: () => void
  clearDraft: () => void
}

const STORAGE_KEY = 'idea-form-draft'

const initialFormState: FormState = {
  title: '',
  description: '',
  target_audience: '',
  category_id: '',
  subcategory_id: undefined,
  tags: '',
  is_anonymous: false,
  is_private: false,
  status: 'draft'
}

export const useCreateIdeaStore = create<CreateIdeaState & CreateIdeaActions>((set, get) => ({
  isOpen: false,
  isFullscreen: false,
  isSubmitting: false,
  isLoadingCategories: true,
  categories: [],
  selectedCategory: null,
  formState: initialFormState,
  error: null,

  setOpen: (open) => set({ isOpen: open }),
  
  toggleFullscreen: () => set(state => ({ isFullscreen: !state.isFullscreen })),
  
  setSubmitting: (submitting) => set({ isSubmitting: submitting }),
  
  loadCategories: async () => {
    try {
      set({ isLoadingCategories: true })
      const categories = await categoryService.getAllCategories()
      set({ categories, isLoadingCategories: false })
    } catch (error) {
      console.error('Error loading categories:', error)
      toast.error("Failed to load categories")
      set({ isLoadingCategories: false })
    }
  },

  setSelectedCategory: (category) => {
    set(state => ({
      ...state,
      selectedCategory: category,
      formState: {
        ...state.formState,
        category_id: category?.id || '',
        subcategory_id: undefined
      }
    }))
  },

  updateFormField: (field, value) => {
    set(state => ({
      formState: {
        ...state.formState,
        [field]: value
      }
    }))
  },

  resetForm: () => {
    set({ 
      formState: initialFormState,
      selectedCategory: null,
      error: null
    })
  },

  loadDraft: () => {
    const savedData = localStorage.getItem(STORAGE_KEY)
    if (savedData) {
      try {
        const formData = JSON.parse(savedData) as FormState
        set({ formState: formData })
        
        // If there's a category_id, set the selected category
        if (formData.category_id) {
          const category = get().categories.find(c => c.id === formData.category_id)
          set({ selectedCategory: category || null })
        }
      } catch (error) {
        console.error('Error loading saved form data:', error)
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  },

  saveDraft: () => {
    const { formState } = get()
    if (Object.values(formState).some(value => value)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formState))
    }
  },

  clearDraft: () => {
    localStorage.removeItem(STORAGE_KEY)
  }
})) 