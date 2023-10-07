const express = require('express');
const app = express();
const db = require('./db');
const bodyParser = require('body-parser');
const moment = require('moment-timezone');

let user_id = 0; // 計算用戶的數量 並當成ID

app.get('/checkdb', (req, res) => {
    db.query('SELECT 1', (err, result) => {
        if (err) {
            console.error('連接不到DB:', err);
            res.status(500).json({ error: '連接不到DB' });
        } else {
            console.log('成功連接到DB by Check');
            res.status(200).json({ message: '連接到DB' });
        }
    });
});

app.use(bodyParser.json());


app.use((req, res, next) => {
    // 檢查 Content-Type -> application/json
    const contentType = req.get('Content-Type');
    if (contentType !== 'application/json') {
        return res.status(400).json({ error: 'Only accept application/json' });
    }

    // 檢查 Request-Date 有沒有符合要求
    const requestDate = req.get('Request-Date');
    if (!requestDate || !isValidDateFormat(requestDate)) {
        return res.status(400).json({ error: 'Invalid or missing Request-Date format' });
    }

    next();
});

// 自定義来檢查日期格式是否符合要求
function isValidDateFormat(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

app.post('/users', async (req, res) => {
    const { name, email, password } = req.body;

    // 檢查有沒有沒填值的部分
    if (!name || !email || !password) {
        return res.status(400).json({ error: '字段不能為空。' });
    }

    // 驗證名字 -> 只包含英文和數字
    const nameRegex = /^[A-Za-z0-9]+$/;
    if (!nameRegex.test(name)) {
        return res.status(400).json({ error: '名字只能包含字母和数字' });
    }

    // 驗證 Email 格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Email 格式不正確' });
    }

    try {
        // 檢查Email 有沒有存在
        const emailExists = await checkIfEmailExists(email);
        if (emailExists) {
            console.log('Email已經存在');
            return res.status(409).json({ error: 'Email Already Exist' });
        } else {
            console.log('Email沒有註冊過');
        }

        // 取得user的數量當作ID
        const rowCount = await getUserCountFromDatabase();
        user_id = rowCount;

        // 調整response的時間格式
        const formattedTime = moment(req.timestamp).tz('Asia/Taipei').format('ddd, DD MMM YYYY HH:mm:ss [GMT]');
        console.log('現在的時間是: ',formattedTime);

        // 把value收集好準備放入資料庫
        const values = [user_id, name, email, password, formattedTime];

        // 執行DB Insert操作
        await insertUserToDatabase(values);

        const responseData = {
            data: {
                user: {
                    id: user_id,
                    name: req.body.name,
                    email: req.body.email,
                },
                'request-date': formattedTime,
            },
        };

        // 成功的res
        res.status(200).json(responseData);
    } catch (error) {
        console.error('發生錯誤:', error);
        res.status(400).json({ error: 'Client Error Response' });
    }
});

// 檢查Email有沒有被註冊過
async function checkIfEmailExists(emailToCheck) {
    const checkEmailSql = 'SELECT COUNT(*) AS email_count FROM user WHERE email = ?';
    return new Promise((resolve, reject) => {
        db.query(checkEmailSql, [emailToCheck], (queryError, results) => {
            if (queryError) {
                console.error('查詢出錯:', queryError);
                reject(queryError);
            } else {
                const emailCount = results[0].email_count;
                resolve(emailCount > 0);
            }
        });
    });
}

// get 用戶在DB的數量
async function getUserCountFromDatabase() {
    const query = 'SELECT COUNT(*) AS row_count FROM user';
    return new Promise((resolve, reject) => {
        db.query(query, (queryError, results) => {
            if (queryError) {
                console.error('查询失败:', queryError);
                reject(queryError);
            } else {
                const rowCount = results[0].row_count;
                console.log('有多少位用户: ', rowCount);
                resolve(rowCount);
            }
        });
    });
}

// Insert user data in DB
async function insertUserToDatabase(values) {
    const insertUserSql = 'INSERT INTO user (id, name, email, password, create_at) VALUES (?, ?, ?, ?, ?)';
    return new Promise((resolve, reject) => {
        db.query(insertUserSql, values, (queryError, result) => {
            if (queryError) {
                console.error('無法插入用戶數據: ', queryError);
                reject(queryError);
            } else {
                console.log('成功加入數據');
                resolve(result);
            }
        });
    });
}

//USER query API

app.get('/users', async (req, res) => {
    const userId = req.query.id;
    console.log(userId);
    if (!userId) {
        return res.status(403).json({ error: 'User Not Existing' });
    }

    try {
        const user = await getUserInfoById(userId);
        console.log(user);
        if (!user) {
            return res.status(403).json({ error: 'User Not Existing' });
        }

        res.status(200).json({ user })

    }
    catch (error) {
        console.error('出現問題', error);
        res.status(400).json({ error: 'Client Error Response' });
    }

})

async function getUserInfoById(userId) {
    return new Promise((resolve, reject) => {
        db.query(
            'SELECT name, email, password, create_at FROM user WHERE id = ?',
            [userId],
            (error, results) => {
                if (error) {
                    console.log("cant find")
                    reject(error);
                } else {
                    console.log("FIND~~");
                    resolve(results[0]); // 返回查詢結果第一行的數據
                }
            }
        );
    });
}

app.listen(3000, () => {
    console.log('Listening to port 3000...');
});
