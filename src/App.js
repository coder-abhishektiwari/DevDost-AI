import DevDostAI from "./DevDostAI";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PreviewPage from "./PreviewPage";
import HomePage from "./HomePage";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/agent" element={<DevDostAI/>}/>
        <Route path="/preview" element={<PreviewPage />} />
      </Routes>
    </BrowserRouter>
  );
}