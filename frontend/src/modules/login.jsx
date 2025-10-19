import { useState, useEffect } from "react";
import "../css/login.css";
import Popup from "../utils/popups";
import FaceScanner from "../utils/faceScanner";

function Login({ goRegister, goDashboard }) {
  const [loading, setLoading] = useState(true); // loading until backend is ready
  const [form, setForm] = useState({
    studentId: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
 

  const [faceOn, setFaceOn] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [popup, setPopup] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const showPopup = (type, message) => {
    setPopup({ show: true, type, message });

    // Auto close after 2 seconds
    setTimeout(() => {
      setPopup({ show: false, type: "", message: "" });
    }, 2000);
  };

  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/health");
        if (res.ok) {
          setLoading(false); // backend is ready → hide loading
        } else {
          setTimeout(checkServer, 200); // retry after 1s
        }
      } catch {
        setTimeout(checkServer, 200); // retry after 1s
      }
    };

    checkServer();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const processLoginSuccess = async (data) => {
    localStorage.setItem("studentId", data.studentId);
    localStorage.setItem("role", data.role);
    showPopup("success", "Login successful!");
    // Trigger backend to refresh collections for new role/assign
    await fetch("http://127.0.0.1:5000/refresh_collections", { method: "POST" });
    goDashboard();
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    try {
      const res = await fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        processLoginSuccess(data);
      } else {
        showPopup("error", data.error || "Login failed");
      }
    } catch {
      setError("Server error");
    }
  };

  const handleGuestLogin = async () => {
    const guestId = "PDM-0000-000000";
    try {
      // Fetch guest.json to get the role
      const guestRes = await fetch("http://127.0.0.1:5000/student/" + guestId);
      // if (!guestRes.ok) {
      //   showPopup("error", "Guest account not found");
      //   return;
      // }
      const guestData = await guestRes.json();
      const guestRole = guestData.role || "Guest";
      console.log("guest result: ",guestData);

      const res = await fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: guestId,
          email: "", // guest.json email is empty
          password: "", // guest.json password is empty
        }),
      });
      const data = await res.json();
      if (res.ok) {
        processLoginSuccess({ studentId: guestId, role: guestRole });
      } else {
        showPopup("error", data.error || "Guest login failed");
      }
    } catch {
      setError("Server error");
    }
  };

  const toggleFace = () => {
    setFaceOn((prev) => !prev)
    console.log(faceOn)
  };

  return (
    <>
      {loading && (
        <div className="absolute flex-col gap-5 w-full h-full z-50 flex items-center justify-center bg-amber-900/10 backdrop-blur-2xl">
          <span className="loader"></span>
          <span class="loaderBar"></span>
        </div>
      )}

      {!loading && (
        <div className="screen w-screen h-screen bg-[linear-gradient(to_top,rgba(121,44,26,0.9),rgba(63,23,13,0.7)),url('/images/PDM-Facade.png')] bg-cover bg-right flex flex-row justify-between items-center">
          {/* Left Card */}
          <div className="w-full h-screen flex flex-col gap-5 justify-center items-center max-sm:h-[80vw]">
            <div className="logo bg-[url('/images/PDM-Logo.svg')] bg-contain w-[30vw] h-[30vw]"></div>

            <h1 className="text-[clamp(2rem,5vw,4rem)] text-center font-sans font-medium text-yellow-500 max-sm:hidden">
              Pambayang Dalubhasaan ng Marilao
            </h1>
          </div>
          {/* Right Card */}
          <div className="login_panel flex flex-col gap-5 justify-center items-center w-[60%] h-full rounded-tl-3xl rounded-bl-3xl bg-gray-100">

            {/* Face Toggle Button */}
            <div className="flex items-center p-1 w-[12%] h-[5%] bg-gray-300 rounded-4xl shadow-gray-400/50 shadow-md overflow-hidden">
              <div className="flex w-full h-full rounded-4xl relative">
                <button
                  className={`bg-white p-2 aspect-square rounded-full transition-transform duration-300 shadow-gray-400 shadow-sm cursor-pointer
                    ${faceOn ? "translate-x-[2vw]" : "translate-x-0"}`}
                  onClick={toggleFace}
                >
                  {faceOn ? (
                    <img src="./webPico/face-scan-svgrepo-com.webp" alt="" />
                  ) : (
                    <img src="./webPico/keyboard-svgrepo-com.webp" alt="" />
                  )}
                </button>
              </div>
            </div>

            

            {/* Login Card */}
            <div className="login_card w-[60%] h-fit py-[10%] px-[3%] rounded-xl shadow-[5px_5px_8px_#bebebe,_-5px_-5px_8px_#ffffff] bg-[#e0e5ec]">
              <div
                className="flex flex-col gap-3 justify-center items-center"
              >
                <input
                  type="text"
                  name="studentId"
                  required
                  className="login_input !rounded-md !h-[10%]"
                  placeholder="Enter Student ID"
                  value={form.studentId}
                  onChange={handleChange}
                />

                <input
                  type="text"
                  name="email"
                  required
                  className="login_input !rounded-md !h-[10%]"
                  placeholder="Enter Student Email"
                  value={form.email}
                  onChange={handleChange}
                />
                <div className="login_input !flex !flex-row !justify-between !rounded-md !h-[10%]">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    className="w-[150%] focus:outline-none password_input !rounded-md"
                    placeholder="Enter Password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange}
                  />
                  <button
                    tabIndex={-1}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="w-[20%] aspect-square hover:scale-102 transform-all duration-200 cursor-pointer"
                  >
                    <img
                      src={
                        showPassword
                          ? "/password/passHide.svg"
                          : "/password/passShow.svg"
                      }
                      alt={showPassword ? "Hide Password" : "Show Password"}
                    />
                  </button>

                </div>
                
                {error && (
                  <div className="text-red-600 font-medium">{error}</div>
                )}
                <div className="w-full flex flex-col gap-4 items-center justify-center">
                  <button
                    type="submit"
                    className="login_button w-[80%] py-[calc(0.5vw+0.5vh)] rounded-lg bg-yellow-500 text-[clamp(0.5rem,1.5vw,2rem)] font-sans font-medium cursor-pointer hover:scale-105 transition-all duration-300 "
                    onClick={handleLogin}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    className="font-sans font-medium underline text-[clamp(0.6rem,1.3vw,1.2rem)] cursor-pointer"
                    onClick={goRegister}
                  >
                    Create Account →
                  </button>

                  <Popup
                    show={popup.show}
                    type={popup.type}
                    message={popup.message}
                    onClose={() =>
                      setPopup({ show: false, type: "", message: "" })
                    }
                  />

                  {faceOn && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-white p-4 rounded-xl shadow-lg relative w-[80%] h-[80%] flex flex-col  justify-center">
                        <button
                          onClick={toggleFace}
                          className="cursor-pointer top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
                        >
                          Close
                        </button>
                        <FaceScanner faceOn={faceOn}/>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="font-sans font-medium shadow-lg text-white shadow-gray-400 py-3 px-10 rounded-full bg-gray-500 text-[clamp(0.6rem,1.3vw,1.2rem)] cursor-pointer hover:scale-102 transition-all duration-300"
              onClick={handleGuestLogin}
            >
              Sign-In as Guest
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Login;
