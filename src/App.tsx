import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from "./components/Header";
import Home from './pages/Home';
import ExcelCompare from './pages/ExcelCompare';
import PdfCompare from './pages/PdfCompare';
import TextCompare from './pages/TextCompare';
import { PageTransition } from './components/TransitionEffects';
import "./App.css";

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
        </Routes>
      </div>
    </PageTransition>
  );
};

function App() {
  return (
    <Router>
      <Header />
      <div className="container">
        <AppRoutes />
      </div>
    </Router>
  );
}

export default App;
