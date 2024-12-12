import React, { useState } from 'react';
import { Verified } from 'lucide-react';

export function TwitterVerificationForm() {
    const [accountUrl, setAccountUrl] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<any | null>(null);
    const [error, setError] = useState('');

    const handleVerification = async () => {
        if (!accountUrl.trim() || !/^[a-zA-Z0-9_.]+$/.test(accountUrl.trim())) {
            setError('Please enter a valid Twitter username');
            return;
        }

        setIsVerifying(true);
        setError('');
        setVerificationResult(null);

        try {
            const response = await fetch('http://localhost:5000/predict_twitter', {
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
            setVerificationResult(result.profile_info);

        } catch (err) {
            console.error(err);
            setError('An error occurred while analyzing the account');
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow p-6 max-w-5xl mx-auto"> 
            <div className="flex items-center mb-4">
                <Verified className="h-8 w-8 text-indigo-600 mr-2" />
                <h2 className="text-xl font-semibold">Twitter Account Verification</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Twitter Username</label>
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
                <div className="mt-6">
                    <h3 className="text-lg font-medium mb-2">Account Information</h3>
                    <div className="bg-gray-100 text-sm p-6 rounded font-mono whitespace-pre-wrap"> 
                        <div>
                            <span className="font-bold text-gray-700">Screen Name:</span> {verificationResult.screen_name}
                        </div>
                        <div>
                            <span className="font-bold text-gray-700">Full Name:</span> {verificationResult.full_name}
                        </div>
                        <div>
                            <span className="font-bold text-gray-700">Location:</span> {verificationResult.location || "N/A"}
                        </div>
                        <div>
                            <span className="font-bold text-gray-700">Description:</span> {verificationResult.description || "N/A"}
                        </div>
                        <div>
                            <span className="font-bold text-gray-700">URL:</span> <a href={verificationResult.url} target="_blank" rel="noopener noreferrer" style={{ color: 'blue', textDecoration: 'underline' }}>{verificationResult.url}</a>
                        </div>
                        <div>
                            <span className="font-bold text-gray-700">Followers Count:</span> {verificationResult.followers_count}
                        </div>
                        <div>
                            <span className="font-bold text-gray-700">Friends Count:</span> {verificationResult.friends_count}
                        </div>
                        <div>
                            <span className="font-bold text-gray-700">Likes Count:</span> {verificationResult.favorites_count}
                        </div>
                        <div>
                            <span className="font-bold text-gray-700">Tweets Count:</span> {verificationResult.statuses_count}
                        </div>
                        <div>
                            <span className="font-bold text-gray-700">Verified:</span> <span style={{ color: verificationResult.verified ? 'green' : 'red', fontWeight: 'bold', textDecoration: 'underline' }}>{verificationResult.verified ? "Yes" : "No"}</span>
                        </div>
                        <div>
                            <span className="font-bold text-gray-700">Created At:</span> {verificationResult.created_at}
                        </div>
                        <div>
                            <span className="font-bold text-gray-700">Avatar Image:</span> <a href={verificationResult.avatar_image} target="_blank" rel="noopener noreferrer" style={{ color: 'blue', textDecoration: 'underline' }}>Click to view avatar</a>
                        </div>
                        <div>
                            <span className="font-bold text-gray-700">Has Extended Profile:</span> {verificationResult.has_extended_profile ? "Yes" : "No"}
                        </div>
                        <div>
                            <span className="font-bold text-gray-700">Language:</span> {verificationResult.lang || "N/A"}
                        </div>
                        <div>
                            <span className="font-bold text-gray-700">Status:</span> {verificationResult.status || "N/A"}
                        </div>
                        <div>
                            <span className="font-bold text-gray-700">Tweet Content:</span> {verificationResult.tweet_content || "N/A"}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}