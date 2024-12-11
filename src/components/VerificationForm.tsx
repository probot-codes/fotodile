
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Instagram, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import type { VerificationResult } from '../types/verification';

const statusIcons: Record<'pass' | 'fail' | 'warning', React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
    pass: CheckCircle,
    fail: XCircle,
    warning: AlertCircle,
};

const statusColors: Record<'pass' | 'fail' | 'warning', string> = {
    pass: 'text-green-600',
    fail: 'text-red-600',
    warning: 'text-yellow-600',
};

export function VerificationForm() {
    const [accountUrl, setAccountUrl] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
    const [error, setError] = useState('');

    const handleVerification = async () => {
        if (!accountUrl.trim() || !/^[a-zA-Z0-9_.]+$/.test(accountUrl.trim())) {
            setError('Please enter a valid Instagram username');
            return;
        }

        setIsVerifying(true);
        setError('');
        setVerificationResult(null);

        try {
            console.log("Sending username to API:", accountUrl.trim());

            const response = await fetch('http://localhost:5000/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: accountUrl.trim() }),
            });

            if (!response.ok) {
                const message = await response.text();
                // Check if the message is a JSON string and try to parse it
                try {
                    const jsonMessage = JSON.parse(message);
                    // If it's JSON, throw the error message from the JSON
                    if (jsonMessage.error) {
                        throw new Error(jsonMessage.error);
                    } else {
                        // If it's JSON but doesn't have an error property, throw the whole JSON
                        throw new Error(JSON.stringify(jsonMessage));
                    }
                } catch (e) {
                    // If it's not JSON, throw the original text message
                    throw new Error(message);
                }
            }

            const result = await response.json();
            console.log("API response:", result);

            if (!result || typeof result !== 'object') {
                throw new Error('Invalid response from the server');
            }

            if (result.error) {
                setError(result.error);
                return;
            }

            setVerificationResult({
                isReal: !result.is_fake,
                riskScore: Math.round(result.fake_probability * 100),
                message: result.is_fake
                    ? 'This account shows signs of being fake.'
                    : 'This account appears to be real.',
                details: [
                    {
                        criterion: 'Profile Picture',
                        description: result.profile_info.profile_pic_url ? 'Present' : 'Absent',
                        status: result.profile_info.profile_pic_url ? 'pass' : 'fail',
                    },
                    {
                        criterion: 'Number of Posts',
                        description: result.profile_info.num_posts.toString(),
                        status: result.profile_info.num_posts > 10 ? 'pass' : 'fail',
                    },
                    {
                        criterion: 'Followers',
                        description: result.profile_info.num_followers.toString(),
                        status: result.profile_info.num_followers > 50 ? 'pass' : 'fail',
                    },
                    {
                        criterion: 'Following',
                        description: result.profile_info.num_follows.toString(),
                        status: result.profile_info.num_follows > 50 ? 'pass' : 'fail',
                    },
                    {
                        criterion: 'External URL',
                        description: result.profile_info.external_url ? 'Present' : 'Absent',
                        status: result.profile_info.external_url ? 'pass' : 'fail',
                    },
                    {
                        criterion: 'Private Account',
                        description: result.profile_info.is_private ? 'Yes' : 'No',
                        status: result.profile_info.is_private ? 'warning' : 'pass',
                    },
                ],
                profile_info: result.profile_info,
            });
        } catch (err) {
            console.error(err);
            setError('An error occurred while analyzing the account');
        } finally {
            setIsVerifying(false);
        }
    };

	return (
        <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="flex items-center mb-6">
                <Shield className="h-8 w-8 text-indigo-600 mr-3" />
                <h2 className="text-2xl font-semibold">Account Verification</h2>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                        Instagram Username
                    </label>
                    <input
                        type="text"
                        value={accountUrl}
                        onChange={(e) => setAccountUrl(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                        placeholder="Enter Instagram username"
                    />
                    {error && <div className="mt-2 text-red-500 text-sm">{error}</div>}
                </div>

                <button
                    onClick={handleVerification}
                    disabled={isVerifying}
                    className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 rounded-lg hover:opacity-90 font-medium disabled:opacity-50"
                >
                    {isVerifying ? 'Verifying...' : 'Verify Account'}
                </button>

                {verificationResult && (
                    <div className="mt-6 space-y-6">
                        <div className={`p-6 rounded-lg flex items-start ${verificationResult.isReal ? 'bg-green-50' : 'bg-red-50'}`}>
                            <Shield className={`h-6 w-6 mr-3 ${verificationResult.isReal ? 'text-green-600' : 'text-red-600'}`} />
                            <div>
                                <h3 className={`font-medium text-lg mb-2 ${verificationResult.isReal ? 'text-green-700' : 'text-red-700'}`}>
                                    {verificationResult.isReal ? 'Verification Successful' : 'Potential Fake Account Detected'}
                                </h3>
                                <p className="text-gray-600">{verificationResult.message}</p>
                            </div>
                        </div>

                        {verificationResult.profile_info.profile_pic_url && (
                            <img
                                src={verificationResult.profile_info.profile_pic_url}
                                alt="Profile"
                                className="w-32 h-32 rounded-full border"
                            />
                        )}

                        <div className="bg-white border rounded-lg p-6">
                            <h2 className="font-medium text-lg mb-4">Verification Details</h2>

                            <div className="space-y-3">
                                {verificationResult.details.map((detail, index) => (
                                    <div key={index} className="flex items-start p-3 rounded-lg bg-gray-50">
                                        {React.createElement(statusIcons[detail.status], {
                                            className: `h-5 w-5 mr-3 mt-0.5 ${statusColors[detail.status]}`,
                                        })}
                                        <div>
                                            <p className="font-medium text-gray-900">{detail.criterion}</p>
                                            <p className="text-sm text-gray-600">{detail.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
    // ... (rest of the component code)
}