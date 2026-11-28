import { useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";
import {TutorCompanionProvider} from './companion/TutorCompanionContext.jsx';

export default function App() {
  useEffect(() => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
  }, []);

  return <TutorCompanionProvider><AppRoutes /></TutorCompanionProvider>;
}
