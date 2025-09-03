import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// --- Helper Components & Icons ---
const Spinner = ({size = 'h-5 w-5', color = 'text-white'}) => (<svg className={`animate-spin ${size} ${color}`} xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>;
const RewindIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zm-2-6l6 4.5V7.5L9 12z"></path></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const PodcastIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 2a10 10 0 0 0-3.54 19.45"></path><path d="M12 8v8"></path><path d="M16 12H8"></path></svg>;
const CardsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const TranslateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2v3"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>;

// --- Audio Conversion Functions ---
const base64ToArrayBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

const pcmToWav = (pcmData, sampleRate) => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.byteLength;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    view.setUint32(0, 1380533830, false); // "RIFF"
    view.setUint32(4, 36 + dataSize, true); // file size - 8
    view.setUint32(8, 1463899717, false); // "WAVE"
    view.setUint32(12, 1718449184, false); // "fmt "
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true); // audio format 1=PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    view.setUint32(36, 1684108385, false); // "data"
    view.setUint32(40, dataSize, true); // data chunk size

    const pcmAsInt16 = new Int16Array(pcmData);
    const wavBytes = new Int16Array(buffer, 44);
    wavBytes.set(pcmAsInt16);

    return new Blob([view], { type: 'audio/wav' });
};

// --- Validation Function ---
const validateApiResponse = (data) => {
    if (typeof data !== 'object' || data === null) return false;
    const { title, description, speakers, lines } = data;
    if (typeof title !== 'string' || typeof description !== 'string') return false;
    if (!Array.isArray(speakers) || speakers.length === 0) return false;
    if (!Array.isArray(lines) || lines.length === 0) return false;
    for (const line of lines) {
        if (typeof line !== 'object' || line === null || typeof line.speaker !== 'string' || typeof line.text !== 'string' || !Array.isArray(line.difficult_words)) {
            return false;
        }
    }
    return true;
};

// --- Sidebar Component ---
const SidebarContent = ({ isGenerating, generationStatus, customTopic, setCustomTopic, handleGenerateEpisode, episodes, currentEpisode, selectEpisode, setIsSidebarOpen, handleDeleteEpisode }) => {
    const defaultTopics = ['在咖啡廳點餐', '迷路問路', '預約餐廳', '討論週末計畫'];
    
    return (
        <div className="bg-gray-800 flex flex-col h-full">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                <h1 className="text-xl font-bold">AI 日語 Podcast</h1>
                <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"> <CloseIcon /> </button>
            </div>

            <div className="p-4 space-y-4 flex-shrink-0">
                <h2 className="text-sm font-semibold text-gray-400">點擊主題，生成新單元</h2>
                <div className="grid grid-cols-2 gap-2">
                    {defaultTopics.map(topic => (
                        <button key={topic} onClick={() => handleGenerateEpisode(topic)} disabled={isGenerating} className="w-full flex justify-center items-center text-sm p-2 bg-gray-700 rounded-md hover:bg-purple-600 transition-colors disabled:bg-gray-600 disabled:cursor-wait">
                            {isGenerating && generationStatus.topic === topic ? <Spinner size="h-4 w-4" /> : topic}
                        </button>
                    ))}
                </div>
                <div className="pt-2">
                    <input type="text" value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} placeholder="或，自訂任何主題" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                    <button onClick={() => handleGenerateEpisode(customTopic)} disabled={isGenerating || !customTopic} className="w-full mt-2 flex justify-center items-center p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-500 disabled:cursor-wait">
                        {isGenerating && generationStatus.topic === customTopic ? <Spinner size="h-4 w-4" /> : '生成自訂單元'}
                    </button>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto border-t border-gray-700">
                {episodes.length > 0 ? (
                    episodes.map(ep => (
                        <div key={ep.id} className={`p-4 cursor-pointer border-b border-gray-700 group relative ${currentEpisode?.id === ep.id ? 'bg-purple-800' : 'hover:bg-gray-700'}`}>
                            <div onClick={() => selectEpisode(ep)}>
                                <h3 className="font-semibold truncate">{ep.title}</h3>
                                <p className="text-sm text-gray-400 truncate">{ep.description}</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteEpisode(ep.id); }} className="absolute top-1/2 -translate-y-1/2 right-4 p-1 rounded-full bg-gray-600 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-opacity">
                                <TrashIcon />
                            </button>
                        </div>
                    ))
                ) : ( <p className="p-4 text-center text-gray-500">尚未生成任何單元。</p> )}
            </div>
        </div>
    );
};

// --- Main App Component ---
export default function App() {
    const [episodes, setEpisodes] = useState([]);
    const [currentEpisode, setCurrentEpisode] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStatus, setGenerationStatus] = useState({ topic: '', message: '' });
    const [customTopic, setCustomTopic] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeView, setActiveView] = useState('podcast');
    const [vocabCards, setVocabCards] = useState([]);
    const [manualJpWord, setManualJpWord] = useState('');
    const [manualCnTranslation, setManualCnTranslation] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);
    
    const audioRef = useRef(null);
    const blobUrlsRef = useRef([]);

    useEffect(() => { return () => { blobUrlsRef.current.forEach(URL.revokeObjectURL); }; }, []);

    const processTextForVocab = (line) => {
        if (!line || !line.text) return { ...line, parts: [{ type: 'text', content: line?.text || '' }] };
        const difficultWords = Array.isArray(line.difficult_words) ? line.difficult_words : [];
        let lastIndex = 0;
        const parts = [];
        const sortedWords = difficultWords.sort((a, b) => line.text.indexOf(a.word) - line.text.indexOf(b.word));
        
        sortedWords.forEach(dw => {
            if (!dw || !dw.word) return;
            const index = line.text.indexOf(dw.word, lastIndex);
            if (index === -1) return;
            if (index > lastIndex) parts.push({ type: 'text', content: line.text.substring(lastIndex, index) });
            parts.push({ type: 'vocab', word: dw.word, translation: dw.translation });
            lastIndex = index + dw.word.length;
        });

        if (lastIndex < line.text.length) parts.push({ type: 'text', content: line.text.substring(lastIndex) });
        return { ...line, parts };
    };

    const addVocabCard = (word, translation) => {
        if (word && translation && !vocabCards.some(card => card.word === word)) {
            setVocabCards(prev => [{ word, translation, flipped: false }, ...prev]);
        }
    };
    
    const handleAddManualCard = () => {
        if (manualJpWord.trim() && manualCnTranslation.trim()) {
            addVocabCard(manualJpWord.trim(), manualCnTranslation.trim());
            setManualJpWord('');
            setManualCnTranslation('');
        }
    };

    const handleAutoTranslate = async () => {
        if (!manualJpWord.trim()) return;
        setIsTranslating(true);
        setManualCnTranslation('');
        const prompt = `請將這個日文單字翻譯成最常見的繁體中文意思，請只回傳翻譯結果，不要包含任何多餘的文字或解釋： "${manualJpWord.trim()}"`;
        try {
            const payload = { contents: [{ parts: [{ text: prompt }] }] };
            const apiKey = ""; // Gemini API key (if needed)
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error('翻譯 API 請求失敗');
            const result = await response.json();
            const translatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (translatedText) {
                setManualCnTranslation(translatedText.trim());
            } else {
                throw new Error('無效的翻譯 API 回應');
            }
        } catch (error) {
            console.error("翻譯失敗:", error);
            alert('自動翻譯失敗，請手動輸入。');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleGenerateEpisode = async (topic) => {
        if (!topic || isGenerating) return;
        setIsGenerating(true);
        setGenerationStatus({ topic, message: '正在生成單元...' });
        if (isSidebarOpen) setIsSidebarOpen(false);

        const MAX_RETRIES = 2;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const prompt = `請生成一個長度約 1 到 2 分鐘的日文 podcast 短劇。主題是：「${topic}」。請遵循以下步驟：1. 設計 2 到 3 位角色，並撰寫一段自然流暢的對話。2. 撰寫完成後，從整段對話中，挑選出 5 到 8 個適合初學者的生難字 (vocabulary)。3. 最後，將所有內容格式化為一個單一的 JSON 物件。請嚴格遵守以下 JSON 格式，不要包含任何 json 標籤以外的文字。在 JSON 的 "lines" 陣列中，每一個 line 物件都【必須】包含 "difficult_words" 這個 key。- 如果第二步中挑選的生難字出現在該句台詞中，請將其加入 "difficult_words" 陣列。- 如果該句台詞中沒有任何挑選出的生難字，"difficult_words" 的值【必須】是一個空陣列 []。範例:{"title": "範例標題","description": "範例描述","speakers": ["角色A", "角色B"],"lines": [{"speaker": "角色A", "text": "こんにちは、田中さん。", "difficult_words": [{"word": "こんにちは", "translation": "你好"}]},{"speaker": "角色B", "text": "元気ですか。", "difficult_words": []}]}`;
                
                const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
                const apiKey = "";
                const textApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                
                const textResponse = await fetch(textApiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!textResponse.ok) throw new Error(`文字 API 請求失敗: ${textResponse.status}`);
                
                const textResult = await textResponse.json();
                const jsonText = textResult.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!jsonText) throw new Error("AI 未回傳任何文字。");

                let generatedData;
                try { generatedData = JSON.parse(jsonText); } 
                catch (e) { throw new Error("AI 回應的 JSON 格式錯誤。"); }

                if (!validateApiResponse(generatedData)) {
                    throw new Error("AI 回應的資料結構不完整。");
                }

                const processedLines = generatedData.lines.map(processTextForVocab);
                const fullTranscriptText = generatedData.lines.map(l => `${l.speaker}: ${l.text}`).join(' ');

                const ttsPayload = { contents: [{ parts: [{ text: `TTS the following conversation: ${fullTranscriptText}` }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { multiSpeakerVoiceConfig: { speakerVoiceConfigs: generatedData.speakers.map((speaker, index) => ({ speaker, voiceConfig: { prebuiltVoiceConfig: { voiceName: ["Kore", "Puck", "Zephyr"][index % 3] } } })) } } }, model: "gemini-2.5-flash-preview-tts" };
                const ttsApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
                const audioResponse = await fetch(ttsApiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ttsPayload) });
                if (!audioResponse.ok) throw new Error(`語音 API 請求失敗`);
                
                const audioResult = await audioResponse.json();
                const audioPart = audioResult?.candidates?.[0]?.content?.parts?.[0];
                if (!audioPart?.inlineData?.data) throw new Error('收到的語音資料無效');

                const sampleRate = parseInt(audioPart.inlineData.mimeType.match(/rate=(\d+)/)[1], 10);
                const pcmData = base64ToArrayBuffer(audioPart.inlineData.data);
                const wavBlob = pcmToWav(pcmData, sampleRate);
                const audioUrl = URL.createObjectURL(wavBlob);
                blobUrlsRef.current.push(audioUrl);

                const newEpisode = { id: Date.now(), ...generatedData, lines: processedLines, audioUrl };
                setEpisodes(prev => [newEpisode, ...prev]);
                selectEpisode(newEpisode);
                
                setIsGenerating(false);
                setGenerationStatus({ topic: '', message: '' });
                return;

            } catch (error) {
                console.error(`Attempt ${attempt + 1} failed:`, error);
                if (attempt < MAX_RETRIES) {
                    setGenerationStatus({ topic, message: `生成失敗，正在嘗試重新連線 (${attempt + 1}/${MAX_RETRIES})` });
                    await new Promise(res => setTimeout(res, 1000 * (attempt + 1))); 
                } else {
                    alert(`生成單元「${topic}」最終失敗: ${error.message}`);
                    setIsGenerating(false);
                    setGenerationStatus({ topic: '', message: '' });
                }
            }
        }
    };
    
    const selectEpisode = (episode) => {
        setCurrentEpisode(episode);
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) {
            audioRef.current.src = episode.audioUrl;
            audioRef.current.load();
        }
        if (isSidebarOpen) setIsSidebarOpen(false);
        setActiveView('podcast');
    };

    const handleDeleteEpisode = (episodeId) => {
        const confirmation = window.confirm("確定要刪除這個單元嗎？");
        if (confirmation) {
            if (currentEpisode?.id === episodeId) {
                setCurrentEpisode(null);
            }
            setEpisodes(prev => prev.filter(ep => ep.id !== episodeId));
        }
    };
    
    const deleteCard = (wordToDelete) => {
        setVocabCards(prev => prev.filter(card => card.word !== wordToDelete));
    };

    const togglePlay = () => { if (!currentEpisode || !audioRef.current || !currentEpisode.audioUrl) return; if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play().catch(e => console.error("播放錯誤:", e)); } setIsPlaying(!isPlaying); };
    const handleTimeUpdate = () => { if(audioRef.current) setCurrentTime(audioRef.current.currentTime); };
    const handleLoadedMetadata = () => { if(audioRef.current) setDuration(audioRef.current.duration); };
    const handleSeek = (event) => { if(audioRef.current) { audioRef.current.currentTime = event.target.value; setCurrentTime(event.target.value); } };
    const changeSpeed = (rate) => { setPlaybackRate(rate); if(audioRef.current) audioRef.current.playbackRate = rate; };
    const rewind = () => { if(audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10); };
    const formatTime = (time) => { if (isNaN(time) || time === 0) return '0:00'; const minutes = Math.floor(time / 60); const seconds = Math.floor(time % 60); return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`; };

    const toggleCardFlip = (index) => {
        setVocabCards(cards => cards.map((card, i) => i === index ? { ...card, flipped: !card.flipped } : card));
    };

    return (
        <div className="bg-gray-900 text-white font-sans h-screen w-screen overflow-hidden flex">
            
            {/* --- Sidebar (for Desktop and Mobile) --- */}
            <aside className={`absolute md:static z-30 top-0 left-0 h-full w-4/5 md:w-1/3 lg:w-1/4 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex-shrink-0`}>
                <SidebarContent {...{ isGenerating, generationStatus, customTopic, setCustomTopic, handleGenerateEpisode, episodes, currentEpisode, selectEpisode, setIsSidebarOpen, handleDeleteEpisode }} />
            </aside>
            {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="md:hidden absolute z-20 inset-0 bg-black/60"></div>}

            {/* --- Main Content Area --- */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header (Fixed) */}
                <header className="md:hidden fixed top-0 left-0 right-0 z-10 p-4 bg-gray-800 flex justify-between items-center w-full">
                    <button onClick={() => setIsSidebarOpen(true)} className="text-gray-300"> <MenuIcon /> </button>
                     <div className="flex items-center space-x-4">
                        <button onClick={() => setActiveView('podcast')} className={`p-1 rounded-full ${activeView === 'podcast' ? 'text-purple-400' : 'text-gray-400'}`}> <PodcastIcon /> </button>
                        <button onClick={() => setActiveView('cards')} className={`p-1 rounded-full ${activeView === 'cards' ? 'text-purple-400' : 'text-gray-400'}`}> <CardsIcon /> </button>
                    </div>
                </header>
                
                {/* Scrollable Main View */}
                <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
                    {activeView === 'podcast' ? (
                        <div className="p-4 md:p-8">
                           <div className="w-full max-w-lg mx-auto">
                                {currentEpisode ? (
                                    <div className="bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
                                        <div className="flex items-center space-x-4">
                                            <img src={`https://placehold.co/100x100/1f2937/7c3aed?text=AI`} alt="Podcast Cover" className="w-20 h-20 rounded-lg flex-shrink-0"/>
                                            <div>
                                                <h2 className="text-xl font-bold">{currentEpisode.title}</h2>
                                                <p className="text-sm text-gray-400">{currentEpisode.description}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <input type="range" min="0" max={duration || 0} value={currentTime} onChange={handleSeek} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer range-sm" disabled={!currentEpisode.audioUrl} />
                                            <div className="flex justify-between text-xs text-gray-400 mt-1"> <span>{formatTime(currentTime)}</span> <span>{formatTime(duration)}</span> </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-1">
                                                {[0.75, 1, 1.25].map(rate => ( <button key={rate} onClick={() => changeSpeed(rate)} className={`px-2 py-1 text-xs rounded-full transition-colors ${playbackRate === rate ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`} disabled={!currentEpisode.audioUrl}> {rate}x </button> ))}
                                            </div>
                                            <div className="flex items-center justify-center space-x-4">
                                                <button onClick={rewind} className="text-gray-400 hover:text-white" disabled={!currentEpisode.audioUrl}><RewindIcon/></button>
                                                <button onClick={togglePlay} className="p-3 bg-purple-600 rounded-full shadow-md hover:bg-purple-700 transition-colors focus:outline-none disabled:bg-gray-500" disabled={!currentEpisode.audioUrl}> 
                                                   {!currentEpisode.audioUrl ? <Spinner size="h-6 w-6"/> : (isPlaying ? <PauseIcon/> : <PlayIcon/>)}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="h-40 p-4 bg-gray-900 rounded-lg overflow-y-auto space-y-2 text-sm">
                                            <h3 className="font-semibold mb-2 text-gray-300">完整字幕</h3>
                                            {currentEpisode.lines.map((line, index) => (
                                                <p key={index} className="text-gray-400 leading-relaxed">
                                                    <span className="font-bold text-purple-400">{line.speaker}: </span>
                                                    {line.parts && line.parts.map((part, i) => part.type === 'vocab' ? ( <strong key={i} className="text-red-400 font-bold cursor-pointer hover:underline" onClick={() => addVocabCard(part.word, part.translation)}> {part.word} </strong> ) : ( <span key={i}>{part.content}</span> ))}
                                                </p>
                                            ))}
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-gray-700">
                                            <h3 className="text-sm font-semibold text-gray-300 mb-2">手動新增單字</h3>
                                            <div className="flex items-stretch sm:items-center gap-2 flex-col sm:flex-row">
                                                <input type="text" value={manualJpWord} onChange={(e) => setManualJpWord(e.target.value)} placeholder="輸入日文單字" className="flex-grow px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"/>
                                                <button onClick={handleAutoTranslate} disabled={!manualJpWord.trim() || isTranslating} className="flex-shrink-0 flex justify-center items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors disabled:bg-gray-700 disabled:cursor-wait text-sm font-semibold">
                                                  {isTranslating ? <Spinner size="h-5 w-5"/> : <TranslateIcon />}
                                                </button>
                                            </div>
                                            <div className="mt-2">
                                                <input type="text" value={manualCnTranslation} onChange={(e) => setManualCnTranslation(e.target.value)} placeholder="中文翻譯會顯示在這裡" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"/>
                                            </div>
                                            <button onClick={handleAddManualCard} disabled={!manualJpWord.trim() || !manualCnTranslation.trim()} className="w-full mt-2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed text-sm font-semibold"> 新增至單字卡 </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center pt-16 md:pt-0 flex flex-col justify-center h-full">
                                        <h2 className="text-2xl font-medium text-gray-400">歡迎使用 AI 日語 App</h2>
                                        <p className="text-gray-500 mt-2">請從左側選單點擊主題，開始學習。</p>
                                        {isGenerating && (
                                            <div className="mt-4 flex flex-col items-center">
                                                <Spinner color="text-purple-500" size="h-8 w-8" />
                                                <p className="mt-2 text-sm text-gray-400">{generationStatus.message}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                       <div className="p-4 md:p-8">
                            <h2 className="text-2xl font-bold mb-4 text-center">我的單字卡 ({vocabCards.length})</h2>
                            {vocabCards.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {vocabCards.map((card, index) => (
                                        <div key={`${card.word}-${index}`} className="relative aspect-video group">
                                            <div onClick={() => toggleCardFlip(index)} className={`absolute w-full h-full rounded-lg shadow-md cursor-pointer transition-transform duration-500 ${card.flipped ? '[transform:rotateY(180deg)]' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
                                                <div className="absolute w-full h-full bg-gray-700 rounded-lg flex items-center justify-center p-2 text-center" style={{ backfaceVisibility: 'hidden' }}>
                                                    <h3 className="text-lg font-bold">{card.word}</h3>
                                                </div>
                                                <div className="absolute w-full h-full bg-purple-700 rounded-lg flex items-center justify-center p-2 text-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                                    <p>{card.translation}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => deleteCard(card.word)} className="absolute -top-2 -right-2 z-10 p-1 bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-red-700 transition-opacity"> <TrashIcon/> </button>
                                        </div>
                                    ))}
                                </div>
                            ) : ( <p className="text-center text-gray-500 mt-8">還沒有任何單字。請到 Podcast 頁面，點擊字幕中的<strong className="text-red-400">紅色生詞</strong>來新增！</p> )}
                        </div>
                    )}
                </main>
            </div>
            
            <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} style={{ display: 'none' }} />
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

