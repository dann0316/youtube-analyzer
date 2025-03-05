import { useState } from "react";

function App() {
    const [keyword, setKeyword] = useState("");
    const [videos, setVideos] = useState([]);
    const [nextPageToken, setNextPageToken] = useState(null);
    const [error, setError] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(-1); // ✅ 선택된 자동완성 항목

    // ✅ 유튜브 영상 검색
    const fetchVideos = async (isNextPage = false) => {
        try {
            const url = `http://localhost:5000/api/videos?keyword=${keyword}${
                nextPageToken && isNextPage ? `&pageToken=${nextPageToken}` : ""
            }`;
            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                setVideos(
                    isNextPage ? [...videos, ...data.videos] : data.videos
                );
                setNextPageToken(data.nextPageToken || null);
                setError("");
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError("서버 요청 실패");
        }
    };

    // ✅ 자동완성 API 호출 함수
    const fetchSuggestions = async (input) => {
        setKeyword(input);
        setSelectedIndex(-1); // 입력할 때마다 선택 초기화
        if (!input.trim()) {
            setSuggestions([]);
            return;
        }
        try {
            const response = await fetch(
                `http://localhost:5000/api/autocomplete?keyword=${input}`
            );
            const data = await response.json();
            setSuggestions(response.ok ? data.suggestions || [] : []);
        } catch (err) {
            setSuggestions([]);
        }
    };

    // ✅ 키보드 이벤트 핸들러
    const handleKeyDown = (e) => {
        if (suggestions.length === 0) return;

        if (e.key === "ArrowDown") {
            setSelectedIndex((prev) =>
                prev < suggestions.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === "ArrowUp") {
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter") {
            if (selectedIndex >= 0) {
                setKeyword(suggestions[selectedIndex]);
                setSuggestions([]);
            }
            fetchVideos();
        }
    };

    // ✅ 성과도 점수를 5단계로 변환하는 함수
    const getPerformanceLabel = (score) => {
        if (score >= 90) return `Great 🚀 (${score})`;
        if (score >= 70) return `Good 👍 (${score})`;
        if (score >= 50) return `Normal 😐 (${score})`;
        if (score >= 41) return `Bad 👎 (${score})`;
        return `Worst ❌ (${score})`;
    };

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h2>🎯 키워드로 유튜브 영상 검색</h2>

            {/* ✅ 검색 입력창 */}
            <div style={{ position: "relative", display: "inline-block" }}>
                <input
                    type="text"
                    placeholder="검색할 키워드를 입력하세요"
                    value={keyword}
                    onChange={(e) => fetchSuggestions(e.target.value)}
                    onKeyDown={handleKeyDown} // ✅ 키보드 이벤트 적용
                    style={{
                        width: "300px",
                        padding: "10px",
                        fontSize: "16px",
                    }}
                />
                <button onClick={fetchVideos} style={{ marginLeft: "10px" }}>
                    검색
                </button>

                {/* ✅ 자동완성 목록 */}
                {suggestions.length > 0 && (
                    <ul
                        style={{
                            position: "absolute",
                            top: "40px",
                            left: "0",
                            width: "300px",
                            background: "#fff",
                            border: "1px solid #ccc",
                            listStyle: "none",
                            padding: "5px",
                            margin: 0,
                            borderRadius: "5px",
                            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                        }}
                    >
                        {suggestions.map((suggestion, index) => (
                            <li
                                key={index}
                                onMouseEnter={() => setSelectedIndex(index)}
                                onClick={() => {
                                    setKeyword(suggestion);
                                    setSuggestions([]);
                                    fetchVideos();
                                }}
                                style={{
                                    padding: "8px",
                                    cursor: "pointer",
                                    borderBottom: "1px solid #eee",
                                    background:
                                        selectedIndex === index
                                            ? "#f0f0f0"
                                            : "transparent", // ✅ 선택된 항목 강조
                                }}
                            >
                                🔎 {suggestion}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {error && <p style={{ color: "red" }}>❌ 오류: {error}</p>}

            <div style={{ marginTop: "20px" }}>
                {videos.length > 0 ? (
                    videos.map((video, index) => (
                        <div
                            key={index}
                            style={{
                                border: "1px solid #ccc",
                                padding: "20px",
                                margin: "10px",
                                borderRadius: "10px",
                            }}
                        >
                            <img
                                src={video.thumbnail}
                                alt="썸네일"
                                width="300"
                                style={{ borderRadius: "10px" }}
                            />
                            <h3>📺 {video.title}</h3>
                            <p>📢 {video.description}</p>
                            <p>
                                📅{" "}
                                {new Date(
                                    video.publishedAt
                                ).toLocaleDateString()}
                            </p>
                            <p>🎬 채널명: {video.channelTitle}</p>
                            <p>조회수: {video.views}</p>
                            <p>
                                <strong>⭐ 성과도:</strong>{" "}
                                {getPerformanceLabel(video.performanceScore)}
                            </p>
                            <a
                                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                🔗 영상 보기
                            </a>
                        </div>
                    ))
                ) : (
                    <p>검색 결과가 없습니다.</p>
                )}
            </div>

            {nextPageToken && (
                <button
                    onClick={() => fetchVideos(true)}
                    style={{
                        marginTop: "20px",
                        padding: "10px",
                        fontSize: "16px",
                    }}
                >
                    🔄 더보기
                </button>
            )}
        </div>
    );
}

export default App;
