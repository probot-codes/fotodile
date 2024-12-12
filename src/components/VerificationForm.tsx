import React, { useState } from 'react';
import { Verified, AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { VerificationResult } from '../types/verification';

const statusIcons = {
    pass: CheckCircle,
    fail: XCircle,
    warning: AlertCircle,
};
const apiUrl = "https://botodile.onrender.com";

const statusColors = {
    pass: 'text-green-600',
    fail: 'text-red-600',
    warning: 'text-yellow-600',
};

export function VerificationForm() {
    const [accountUrl, setAccountUrl] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
    const [error, setError] = useState('');
    const [showFullBio, setShowFullBio] = useState(false);

    const handleVerification = async () => {
        if (!accountUrl.trim() || !/^[a-zA-Z0-9_.]+$/.test(accountUrl.trim())) {
            setError('Please enter a valid Instagram username');
            return;
        }

        setIsVerifying(true);
        setError('');
        setVerificationResult(null);

        try {
            const response = await fetch(`${apiUrl}/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: accountUrl.trim() }),
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            const result = await response.json();

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
                socialLinks: result.social_links, // Add socialLinks from the response
            });
        } catch (err) {
            console.error(err);
            setError('An error occurred while analyzing the account');
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow p-6 max-w-9xl mx-auto">
            <div className="flex items-center mb-4">
                <Verified className="h-8 w-8 text-indigo-600 mr-2" />
                <h2 className="text-xl font-semibold">Account Verification</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instagram Username</label>
                    <input
                        type="text"
                        value={accountUrl}
                        onChange={(e) => setAccountUrl(e.target.value)}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                        placeholder="Enter username"
                    />
                    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                </div>
                <div className="col-span-1 flex items-end">
                    <button
                        onClick={handleVerification}
                        disabled={isVerifying}
                        className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {isVerifying ? 'Verifying...' : 'Verify'}
                    </button>
                </div>
            </div>

            {verificationResult && (
                <div className="mt-6 space-y-4">
                    <div className={`p-4 rounded-lg flex items-center ${verificationResult.isReal ? 'bg-green-50' : 'bg-red-50'}`}>
                        {React.createElement(
                            statusIcons[verificationResult.isReal ? 'pass' : 'fail'],
                            { className: `h-6 w-6 mr-3 ${verificationResult.isReal ? 'text-green-600' : 'text-red-600'}` }
                        )}
                        <div>
                            <h3 className={`font-medium text-lg ${verificationResult.isReal ? 'text-green-700' : 'text-red-700'}`}>
                                {verificationResult.isReal ? 'Verified Account' : 'Fake Account Suspected'}
                            </h3>
                            <p className="text-gray-600 text-sm">{verificationResult.message}</p>
                            <p className="text-gray-600 text-sm">Probability: {verificationResult.riskScore}%</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-medium mb-2">Account Information</h3>
                            <div className="bg-gray-100 text-sm p-6 rounded font-mono break-words whitespace-pre-wrap w-full">
                                <div>
                                    <span className="font-bold text-gray-700">username:</span> {verificationResult.profile_info.username}
                                </div>
                                <div>
                                    <span className="font-bold text-gray-700">full_name:</span> {verificationResult.profile_info.full_name}
                                </div>
                                <div>
                                    <span className="font-bold text-gray-700">biography:</span> {verificationResult.profile_info.biography}
                                </div>
                                <div>
                                    <span className="font-bold text-gray-700">profile_picture_url:</span> <a href={verificationResult.profile_info.profile_pic_url} target="_blank" rel="noopener noreferrer" style={{ color: 'blue', textDecoration: 'underline' }}>Click to view profile picture</a>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium mb-2">Verification Details</h3>
                            <table className="w-full table-auto border-collapse border border-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Criterion</th>
                                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Value</th>
                                        <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {verificationResult.details.map((detail, index) => (
                                        <tr key={index}>
                                            <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">{detail.criterion}</td>
                                            <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900">{detail.description}</td>
                                            <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900 flex items-center">
                                                {React.createElement(statusIcons[detail.status], {
                                                    className: `h-5 w-5 ${statusColors[detail.status]} mr-2`,
                                                })}
                                                {detail.status}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Display social links */}
                    <div> 
                        <h3 className="text-lg font-medium mb-2">Social Media Presence</h3>
                        {verificationResult.socialLinks.length > 0 ? (
                            <ul>
                                {verificationResult.socialLinks.map((link, index) => (
                                    <li key={index}>
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: 'blue', textDecoration: 'underline' }}>
                                            {link.platform}: {link.url}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-600 text-sm">No other social media presence found.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}