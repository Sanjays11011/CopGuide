import React, { useState } from 'react';
import axios from 'axios';
import LoginImg from '../../assets/images/login-img.png';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
    const navigate = useNavigate();

    // State for form inputs and error/success messages
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form inputs
        if (!email || !password) {
            setError('Please fill in all fields.');
            return;
        }

        try {
            const response = await axios.post('http://localhost:5000/login', {
                email: email,
                password: password
            });
            const token = response.data.token;
            sessionStorage.setItem('token', token);
            setSuccess('Login successful!');
            setError('');
            navigate('/chatinterface');  

        } catch (error) {
            // Handle errors from the API response
            if (error.response && error.response.data) {
                setError(error.response.data.error || 'Login failed.');
            } else {
                setError('Failed to connect to the server.');
            }
        }
    };

    return (
        <div className="flex h-screen font-outfit bg-gradient-to-r from-[#040404] to-[#2d8cff]">
            {/* Left Section - Form */}
            <div className="md:w-3/5 w-full bg-gray-800 flex flex-col justify-center items-center p-10">
                <h1 className="md:text-5xl text-3xl mb-6 text-white">Welcome to Copsify</h1>

                <form className="space-y-4 md:w-3/4 w-full" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="w-full p-3 border rounded mt-1 bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="w-full p-3 border rounded mt-1 bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)} 
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    {success && <p className="text-green-400 text-sm">{success}</p>}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="remember"
                                className="h-4 w-4 text-blue-500 border-gray-600 rounded bg-gray-700"
                            />
                            <label htmlFor="remember" className="ml-2 block text-sm text-gray-300">Remember me</label>
                        </div>

                        <div className="text-sm">
                            <a href="#" className="text-blue-400 hover:text-blue-300">Forgot Password?</a>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
                    >
                        Sign In
                    </button>
                </form>

                <p className="mt-4 text-sm text-center text-gray-400">
                    Don’t have an account? <Link to='/signup' className="text-blue-400 hover:text-blue-300">Sign Up</Link>
                </p>
            </div>

            {/* Right Section - Image */}
            <div className="md:flex hidden w-1/2 bg-gray-700 justify-center items-center">
                <img
                    src={LoginImg}
                    alt="Robot holding a phone"
                    className="w-full h-full"
                />
            </div>
        </div>
    );
};

export default Login;