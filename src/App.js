import React from "react";
import { Routes, Route } from "react-router-dom"; // No need to import BrowserRouter here
import Login from "./Login";
import Home from "./Home";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />  {/* optional, lowercase convention */}
      <Route path="/home" element={<Home />} />   {/* added Home route */}
    </Routes>
  );
}

export default App;
