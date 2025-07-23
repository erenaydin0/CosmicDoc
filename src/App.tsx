import { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from "./components/Header";
import Home from './pages/Home';
import ExcelCompare from './pages/ExcelCompare';
import PdfCompare from './pages/PdfCompare';
import TextCompare from './pages/TextCompare';
import FileConvert from './pages/FileConvert';
import PageTransition from './components/PageTransition';
import "./App.css";
import "./style/PageStyles.css";

const THEME_STORAGE_KEY = 'synchdoc-theme-preference';

// Sayfaların dış wrapper bileşeni
const AppRoutes = () => {
  const location = useLocation();

  return (
    <PageTransition>
      <div className="page-content-wrapper" data-path={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/excel-compare" element={<ExcelCompare />} />
          <Route path="/pdf-compare" element={<PdfCompare />} />
          <Route path="/text-compare" element={<TextCompare />} />
          <Route path="/file-convert" element={<FileConvert />} />
        </Routes>
      </div>
    </PageTransition>
  );
};

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => {
      // Önce localStorage'dan tema tercihini kontrol et
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as 'light' | 'dark';
      if (savedTheme) {
        return savedTheme;
      }
      
      // Eğer localStorage'da tema yoksa, HTML data-theme özelliğini kontrol et
      const htmlTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark';
      if (htmlTheme) {
        return htmlTheme;
      }
      
      // Hiçbir tercih bulunamadıysa varsayılan olarak 'light' tema kullan
      return 'light';
    }
  );

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    // Sayfa yüklendiğinde HTML'e tema özelliğini uygula
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <Router>
      <Header toggleTheme={toggleTheme} />
      <div className="container">
        <AppRoutes />
      </div>
    </Router>
  );
}

export default App;
