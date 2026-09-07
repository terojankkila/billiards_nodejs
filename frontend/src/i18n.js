import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import fi from './locales/fi.json'

const savedLng = localStorage.getItem('language')

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fi: { translation: fi },
  },
  lng: savedLng || 'fi',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export function setLanguage(lng) {
  localStorage.setItem('language', lng)
  i18n.changeLanguage(lng)
}

export default i18n