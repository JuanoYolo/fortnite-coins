import { Navigate, Route, Routes } from "react-router-dom";
import CoinDetailPage from "./pages/CoinDetailPage";
import HomePage from "./pages/HomePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/coin/:display_name" element={<CoinDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
