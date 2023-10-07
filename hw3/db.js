const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'amazon123.czdl6rh8prt6.ap-southeast-2.rds.amazonaws.com',     // 数据库主机名
    user: 'martin',     // 数据库用户名
    password: 'm9960979', // 数据库密码
    database: 'assignment'  // 数据库名
});

// 测试数据库连接
db.connect((err) => {
    if (err) {
      console.error('DB連接失敗', err);
    } else {
      console.log('成功連接到DB');
    }
  });
  
module.exports = db;
