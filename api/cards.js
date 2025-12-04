const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Vercel 會自動處理環境變數，這主要用於本地開發
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
    try {
        // 從 Supabase 的 'cards' 資料表中選擇所有資料
        const { data, error } = await supabase
            .from('cards')
            .select('*');

        if (error) {
            // 如果 Supabase 回傳錯誤，則將錯誤記錄到後端日誌並回傳 500 錯誤
            console.error('Supabase error:', error);
            return res.status(500).json({ error: 'Failed to fetch data from database.' });
        }

        // 成功取得資料，回傳 JSON 格式的資料
        res.status(200).json(data);

    } catch (e) {
        // 捕獲其他預期外的錯誤
        console.error('Unexpected error:', e);
        return res.status(500).json({ error: 'An unexpected error occurred.' });
    }
};