const http = require('http');
const qs = require('querystring');
const req = http.request('http://localhost:3000/', {method: 'GET'}, (res) => {
    const cookie = res.headers['set-cookie'] ? res.headers['set-cookie'][0].split(';')[0] : '';
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Got cookie:', cookie);
        // We just do a post request to comment with this cookie but missing _csrf to see if we get the error
        const postData = qs.stringify({ post_id: 1, author_name: 'Test', content: 'test' });
        const req2 = http.request('http://localhost:3000/comment', {
            method: 'POST',
            headers: { 'Cookie': cookie, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': postData.length }
        }, (res2) => {
            let data2 = '';
            res2.on('data', c => data2+=c);
            res2.on('end', () => console.log('Response without CSRF:', res2.statusCode, data2));
        });
        req2.write(postData);
        req2.end();
        
        // And one WITH CSRF token, but since we didn't scrape the CSRF token we can't test it.
        // Let's scrape it from the login page!
        const req3 = http.request('http://localhost:3000/admin/login', {method: 'GET', headers: { 'Cookie': cookie }}, (res3) => {
            let data3 = '';
            res3.on('data', c => data3 += c);
            res3.on('end', () => {
                const match = data3.match(/name=\"_csrf\" value=\"([^\"]+)\"/);
                const csrf = match ? match[1] : null;
                console.log('CSRF Token from login:', csrf);
                if (csrf) {
                    const postData2 = qs.stringify({ _csrf: csrf, post_id: 1, author_name: 'Test', content: 'test' });
                    const req4 = http.request('http://localhost:3000/comment', {
                        method: 'POST',
                        headers: { 'Cookie': cookie, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': postData2.length }
                    }, (res4) => {
                        let data4 = '';
                        res4.on('data', c => data4+=c);
                        res4.on('end', () => console.log('Response WITH CSRF:', res4.statusCode, data4));
                    });
                    req4.write(postData2);
                    req4.end();
                }
            });
        });
        req3.end();
    });
});
req.end();
