require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());

// ✅ 영상 길이에 따른 예상 시청 지속율 계산 함수
function getEstimatedWatchTimeRate(videoLength) {
    if (videoLength <= 180) {
        // 3분 이하
        return 0.6;
    } else if (videoLength <= 600) {
        // 10분 이하
        return 0.5;
    } else if (videoLength <= 1200) {
        // 20분 이하
        return 0.4;
    } else {
        return 0.3;
    }
}

// ✅ 업로드 시간 가중치 (18시~21시 업로드 시 가산점)
function getUploadTimeBonus(publishedAt) {
    const hour = new Date(publishedAt).getHours();
    return hour >= 18 && hour <= 21 ? 5 : 0;
}

// ✅ 성과도 계산 함수 (Viewtrap 유사 알고리즘 적용)
function calculatePerformanceScore(
    views,
    subscribers,
    daysSincePosted,
    likes,
    comments,
    averageViewDuration,
    videoLength,
    title,
    keyword,
    publishedAt
) {
    const speedScore = Math.min((views / daysSincePosted) * 0.002, 30);
    const retentionRate = (averageViewDuration / videoLength) * 100;
    const retentionScore = Math.min(retentionRate * 0.2, 20);
    const engagementScore = Math.min(
        ((likes + comments * 2) / views) * 100 * 0.2,
        20
    );
    const viewToSubscriberScore = Math.min((views / subscribers) * 20, 20);
    const keywordMatchScore = title.includes(keyword) ? 5 : 0;
    const timeBonus = getUploadTimeBonus(publishedAt);

    return Math.round(
        speedScore +
            retentionScore +
            engagementScore +
            viewToSubscriberScore +
            keywordMatchScore +
            timeBonus
    );
}

// ✅ YouTube 영상 검색 API + 성과도 계산
app.get("/api/videos", async (req, res) => {
    try {
        const { keyword, pageToken } = req.query;

        if (!keyword) {
            return res
                .status(400)
                .json({ error: "검색할 키워드를 입력하세요." });
        }

        const API_KEY = process.env.YOUTUBE_API_KEY;

        // 🔹 검색 API 호출
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
            keyword
        )}&type=video&maxResults=10&key=${API_KEY}&pageToken=${
            pageToken || ""
        }`;
        const searchResponse = await axios.get(searchUrl);

        // 🔹 제목에 정확히 키워드가 포함된 것만 필터링
        const filteredItems = searchResponse.data.items.filter((item) =>
            item.snippet.title.includes(keyword)
        );

        // 🔹 필터링된 영상들의 상세 데이터 요청
        const videoIds = filteredItems.map((item) => item.id.videoId).join(",");
        if (!videoIds) {
            return res.json({
                videos: [],
                nextPageToken: searchResponse.data.nextPageToken || null,
            });
        }

        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${API_KEY}`;
        const detailsResponse = await axios.get(detailsUrl);

        // 🔹 성과도 계산 및 데이터 구성
        const videos = filteredItems.map((item) => {
            const details = detailsResponse.data.items.find(
                (d) => d.id === item.id.videoId
            );
            const statistics = details.statistics || {};
            const contentDetails = details.contentDetails || {};

            const views = parseInt(statistics.viewCount || 0);
            const likes = parseInt(statistics.likeCount || 0);
            const comments = parseInt(statistics.commentCount || 0);
            const videoLength = convertDurationToSeconds(
                contentDetails.duration || "PT0S"
            );
            const daysSincePosted = getDaysSincePosted(
                item.snippet.publishedAt
            );

            const estimatedWatchTimeRate =
                getEstimatedWatchTimeRate(videoLength);
            const averageViewDuration = videoLength * estimatedWatchTimeRate;

            const performanceScore = calculatePerformanceScore(
                views,
                10000,
                daysSincePosted,
                likes,
                comments,
                averageViewDuration,
                videoLength,
                item.snippet.title,
                keyword,
                item.snippet.publishedAt
            );

            return {
                videoId: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails.high.url,
                publishedAt: item.snippet.publishedAt,
                channelTitle: item.snippet.channelTitle,
                views,
                likes,
                comments,
                videoLength,
                performanceScore,
            };
        });

        // 🔹 조회수 기준 정렬
        videos.sort((a, b) => b.views - a.views);

        res.json({
            videos,
            nextPageToken: searchResponse.data.nextPageToken || null,
        });
    } catch (error) {
        console.error("❌ 서버 오류:", error);
        res.status(500).json({
            error: "서버 오류 발생",
            details: error.message,
        });
    }
});

// ✅ 유튜브 영상 길이 변환 (PnDTnHnMnS → 초)
function convertDurationToSeconds(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;
    return hours * 3600 + minutes * 60 + seconds;
}

// ✅ 업로드 후 경과 일수 계산
function getDaysSincePosted(publishedAt) {
    const publishedDate = new Date(publishedAt);
    const today = new Date();
    const diffTime = Math.abs(today - publishedDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ✅ 검색 자동완성 API
app.get("/api/autocomplete", async (req, res) => {
    try {
        const { keyword } = req.query;
        if (!keyword) {
            return res.status(400).json({ error: "검색어를 입력하세요." });
        }

        const suggestUrl = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(
            keyword
        )}`;
        const response = await axios.get(suggestUrl);

        const suggestions = response.data[1] || [];

        res.json({ suggestions });
    } catch (error) {
        console.error("❌ 자동완성 API 오류:", error);
        res.status(500).json({
            error: "자동완성 데이터를 가져오는 중 오류 발생",
            details: error.message,
        });
    }
});

// ✅ 서버 실행
app.listen(PORT, () => {
    console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
