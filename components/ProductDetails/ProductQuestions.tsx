import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Product } from '../../types';
import { isAIFeatureEnabled } from '@/lib/ai-feature-flags';

interface ProductQuestionsProps {
    product: Product;
}

const ProductQuestions: React.FC<ProductQuestionsProps> = ({ product }) => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [aiEnabled, setAiEnabled] = useState<boolean>(true);

    React.useEffect(() => {
        let mounted = true;
        isAIFeatureEnabled('product_questions')
            .then((enabled) => {
                if (mounted) setAiEnabled(enabled);
            })
            .catch(() => {
                // Default to enabled if we can't read flags.
                if (mounted) setAiEnabled(true);
            });
        return () => {
            mounted = false;
        };
    }, []);

    const handleAsk = async () => {
        if (!aiEnabled) {
            setAnswer('AI Q&A is currently disabled by the platform admin.');
            return;
        }
        if (!question.trim()) return;

        setLoading(true);
        setAnswer(null);

        try {
            const { data: { result }, error } = await supabase.functions.invoke('ai-assistant', {
                body: {
                    action: 'answer_product_question',
                    params: {
                        product_title: product.title,
                        description: product.description,
                        attributes: {}, // Pass product.attributes if available in your type
                        question: question
                    }
                }
            });

            if (error) throw error;
            setAnswer(result.replace(/^"|"$/g, ''));
        } catch (err: any) {
            console.error('AI Q&A Error:', err);
            setAnswer("I'm having trouble connecting to the AI helper right now. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-6 border border-indigo-100 shadow-sm mt-8">
            <div className="flex items-center gap-2 mb-4">
                <span className="material-icons text-indigo-500">auto_awesome</span>
                <h3 className="text-lg font-bold text-gray-900">Ask OpenAI about this product</h3>
            </div>

            {!aiEnabled && (
                <div className="mb-4 bg-white border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-icons text-amber-700 text-sm">info</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">AI Q&A is turned off</p>
                            <p className="text-xs text-gray-600 mt-1">
                                This feature is currently disabled by the platform admin.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="E.g., Is this machine washable? What material is it?"
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                    disabled={!aiEnabled}
                />
                <button
                    onClick={handleAsk}
                    disabled={loading || !question.trim() || !aiEnabled}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                    {!aiEnabled ? 'AI Disabled' : loading ? 'Asking...' : 'Ask AI'}
                </button>
            </div>

            {loading && (
                <div className="flex items-center gap-2 text-indigo-600 text-sm animate-pulse">
                    <span className="material-icons text-base">hourglass_empty</span>
                    Thinking...
                </div>
            )}

            {answer && !loading && (
                <div className="bg-white border border-indigo-100 rounded-lg p-4 animate-fade-in">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-icons text-indigo-600 text-sm">smart_toy</span>
                        </div>
                        <p className="text-gray-800 text-sm leading-relaxed pt-1">
                            {answer}
                        </p>
                    </div>
                    <div className="mt-2 text-[10px] text-gray-400 text-right">
                        Answer generated by AI based on product details.
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductQuestions;
