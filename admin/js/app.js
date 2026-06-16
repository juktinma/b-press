function formatDatetimeLocal(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        // Convert to local timezone ISO string
        const offset = d.getTimezoneOffset() * 60000;
        const localTime = new Date(d.getTime() - offset);
        return localTime.toISOString().slice(0, 16);
    } catch (e) {
        return '';
    }
}

class App {
    constructor() {
        this.root = document.getElementById('app-root');
        this.routes = {
            'dashboard': this.renderDashboard.bind(this),
            'posts': this.renderPosts.bind(this),
            'editor': this.renderEditor.bind(this),
            'categories': this.renderCategories.bind(this),
            'comments': this.renderComments.bind(this),
            'pages': this.renderPages.bind(this),
            'page-editor': this.renderPageEditor.bind(this),
            'files': this.renderFiles.bind(this),
            'themes': this.renderThemes.bind(this),
            'settings': this.renderSettings.bind(this)
        };
        
        window.addEventListener('hashchange', () => this.router());
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            window.location.href = 'login.html';
        });

        this.init();
    }

    init() {
        if (!localStorage.getItem('adminToken')) {
            window.location.href = 'login.html';
            return;
        }

        // 动态加载站点名称并替换写死的 "B-Press Admin"
        api.get('/settings').then(settings => {
            if (settings && settings.site_title) {
                const sidebarHeader = document.querySelector('.sidebar-header');
                if (sidebarHeader) sidebarHeader.textContent = settings.site_title + ' Admin';
                document.title = settings.site_title + ' 控制台';
            }
        });

        if (!window.location.hash) {
            window.location.hash = '#dashboard';
        } else {
            this.router();
        }
    }

    router() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        const route = hash.split('/')[0];
        
        // Update nav active state
        document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-menu a[href="#${route}"]`);
        if (activeLink) activeLink.classList.add('active');

        if (this.routes[route]) {
            this.routes[route]();
        } else {
            this.root.innerHTML = '<h2>404 Not Found</h2>';
        }
    }

    showModal(title, htmlContent, onConfirm) {
        const modal = document.getElementById('global-modal');
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerHTML = htmlContent;
        
        const confirmBtn = document.getElementById('modal-confirm');
        // clone and replace to remove old event listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        newConfirmBtn.addEventListener('click', async () => {
            await onConfirm();
            this.closeModal();
        });
        
        modal.style.display = 'flex';
    }

    closeModal() {
        document.getElementById('global-modal').style.display = 'none';
    }

    async renderDashboard() {
        this.root.innerHTML = `<div class="page-header"><h2>仪表盘</h2></div><p>加载中...</p>`;
        const stats = await api.get('/dashboard/stats');
        if (!stats) return;

        let html = `
            <div style="display:flex; gap: 30px; flex-wrap: wrap;">
                <!-- 左侧：概要与快速开始 -->
                <div style="flex: 2; min-width: 300px;">
                    <div class="table-wrapper" style="padding: 25px; margin-bottom: 25px;">
                        <h3 style="margin-bottom: 15px; color: var(--admin-primary); border-bottom: 1px solid var(--admin-border); padding-bottom: 10px;">网站概要</h3>
                        <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 80px; background: #f8fafc; border: 1px solid var(--admin-border); border-radius: 8px; padding: 15px; text-align: center;">
                                <div style="font-size: 2rem; color: var(--admin-primary); font-weight: bold;">${stats.counts.posts}</div>
                                <div style="color: var(--admin-text-muted); font-size: 0.9rem; margin-top: 5px;">文章</div>
                            </div>
                            <div style="flex: 1; min-width: 80px; background: #f8fafc; border: 1px solid var(--admin-border); border-radius: 8px; padding: 15px; text-align: center;">
                                <div style="font-size: 2rem; color: var(--admin-primary); font-weight: bold;">${stats.counts.comments}</div>
                                <div style="color: var(--admin-text-muted); font-size: 0.9rem; margin-top: 5px;">评论</div>
                            </div>
                            <div style="flex: 1; min-width: 80px; background: #f8fafc; border: 1px solid var(--admin-border); border-radius: 8px; padding: 15px; text-align: center;">
                                <div style="font-size: 2rem; color: var(--admin-primary); font-weight: bold;">${stats.counts.categories}</div>
                                <div style="color: var(--admin-text-muted); font-size: 0.9rem; margin-top: 5px;">分类</div>
                            </div>
                        </div>
                        <p style="margin-top: 15px; color: var(--admin-text-muted);">点击下面的链接快速开始:</p>
                        <div style="margin-top: 15px; display: flex; gap: 15px;">
                            <a href="#editor" class="btn">撰写新文章</a>
                            <a href="#themes" class="btn" style="background: #f1f5f9; color: var(--admin-text);">更换外观</a>
                            <a href="#settings" class="btn" style="background: #f1f5f9; color: var(--admin-text);">系统设置</a>
                        </div>
                    </div>
                </div>

                <!-- 右侧：动态列表 -->
                <div style="flex: 1; min-width: 300px; display: flex; flex-direction: column; gap: 25px;">
                    <div class="table-wrapper" style="padding: 20px;">
                        <h3 style="margin-bottom: 15px; font-size: 1.1rem; color: var(--admin-text-muted);">最近发布的文章</h3>
                        <ul style="list-style: none;">
                            ${stats.recentPosts.length === 0 ? '<li style="color:var(--admin-text-muted)">暂无文章</li>' : ''}
                            ${stats.recentPosts.map(p => `
                                <li style="margin-bottom: 10px; display: flex; justify-content: space-between;">
                                    <a href="#editor/${p.id}" style="color: var(--admin-text); text-decoration: underline;">${p.title}</a>
                                    <span style="color: var(--admin-text-muted); font-size: 0.9rem;">${new Date(p.created_at).toLocaleDateString()}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>

                    <div class="table-wrapper" style="padding: 20px;">
                        <h3 style="margin-bottom: 15px; font-size: 1.1rem; color: var(--admin-text-muted);">最近得到的回复</h3>
                        <ul style="list-style: none;">
                            ${stats.recentComments.length === 0 ? '<li style="color:var(--admin-text-muted)">暂无回复</li>' : ''}
                            ${stats.recentComments.map(c => `
                                <li style="margin-bottom: 10px; border-bottom: 1px dashed var(--admin-border); padding-bottom: 8px;">
                                    <strong style="color: var(--admin-primary);">${c.author_name}</strong>: 
                                    <span style="color: var(--admin-text);">${c.content.substring(0, 30) + '...'}</span>
                                    <div style="color: var(--admin-text-muted); font-size: 0.85rem; margin-top: 4px;">${new Date(c.created_at).toLocaleDateString()}</div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
        this.root.innerHTML = `<div class="page-header"><h2>仪表盘</h2></div>` + html;
    }

    async renderPosts() {
        this.root.innerHTML = `<div class="page-header"><h2>文章管理</h2> <a href="#editor" class="btn">写文章</a></div>`;
        const data = await api.get('/posts?limit=50');
        if (!data) return;

        let html = `<div class="table-wrapper"><table><thead><tr><th>标题</th><th>状态</th><th>浏览</th><th>日期</th><th>操作</th></tr></thead><tbody>`;
        data.posts.forEach(p => {
            html += `<tr>
                <td>${p.title}</td>
                <td>${p.status}</td>
                <td>${p.views}</td>
                <td>${new Date(p.created_at).toLocaleDateString()}</td>
                <td><a href="#editor/${p.id}" class="action-btn">编辑</a> <button class="action-btn danger" onclick="app.deletePost(${p.id})">删除</button></td>
            </tr>`;
        });
        html += `</tbody></table></div>`;
        this.root.innerHTML += html;
    }

    async renderEditor() {
        this.currentEditorUploads = [];
        const hashParts = window.location.hash.split('/');
        const id = hashParts[1];
        let post = { title: '', slug: '', content: '', status: 'published', category_id: null };
        
        if (id) {
            const data = await api.get('/posts/' + id);
            if (data) post = data;
        }

        const cats = await api.get('/categories') || [];
        const catOptions = cats.map(c => `<option value="${c.id}" ${post.category_id == c.id ? 'selected' : ''}>${c.name}</option>`).join('');

        this.root.innerHTML = `
            <div class="page-header">
                <h2>${id ? '编辑文章' : '撰写新文章'}</h2>
            </div>
            <div style="display:flex; gap: 20px;">
                <div style="flex: 3;">
                    <input type="text" id="post-title" class="form-control" placeholder="在此输入标题" value="${post.title}" style="font-size: 1.2rem; margin-bottom: 20px;">
                    <textarea id="post-content">${post.content}</textarea>
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 20px;">
                    <div class="table-wrapper" style="padding: 15px;">
                        <h3>发布</h3>
                        <div style="margin-top: 15px;">
                            <label>状态：</label>
                            <select id="post-status" class="form-control" style="margin-bottom:15px;">
                                <option value="published" ${post.status === 'published' ? 'selected' : ''}>公开</option>
                                <option value="draft" ${post.status === 'draft' ? 'selected' : ''}>草稿</option>
                            </select>
                            <label>URL缩略名：</label>
                            <input type="text" id="post-slug" class="form-control" style="margin-bottom:15px;" value="${post.slug || ''}">
                            <label>发布时间：</label>
                            <input type="datetime-local" id="post-created-at" class="form-control" style="margin-bottom:15px;" value="${formatDatetimeLocal(post.created_at)}">
                            <button class="btn btn-block" onclick="app.savePost(${id || 'null'})">发布文章</button>
                        </div>
                    </div>
                    <div class="table-wrapper" style="padding: 15px;">
                        <h3>分类目录</h3>
                        <select id="post-category" class="form-control" style="margin-top: 10px;">
                            <option value="">(无分类)</option>
                            ${catOptions}
                        </select>
                    </div>
                    <div class="table-wrapper" style="padding: 15px;">
                        <h3>标签 (逗号分隔)</h3>
                        <input type="text" id="post-tags" class="form-control" style="margin-top: 10px;" placeholder="例如: typecho, php, blog" value="${post.tags ? post.tags.join(', ') : ''}">
                    </div>
                    <div class="table-wrapper" style="padding: 15px;">
                        <h3>头图设置</h3>
                        <div style="margin-top: 10px;">
                            <img id="post-cover-preview" src="${post.cover_image || ''}" style="width:100%; max-height:120px; object-fit:cover; border-radius:4px; margin-bottom:10px; display: ${post.cover_image ? 'block' : 'none'};">
                            <input type="text" id="post-cover-image" class="form-control" style="margin-bottom:10px;" placeholder="输入图片链接或上传" value="${post.cover_image || ''}" oninput="document.getElementById('post-cover-preview').src = this.value; document.getElementById('post-cover-preview').style.display = this.value ? 'block' : 'none';">
                            <label class="btn btn-block" style="cursor:pointer; text-align:center;">上传头图<input type="file" style="display:none" accept="image/*" onchange="app.uploadCover(this)"></label>
                            
                            <div style="margin-top: 15px; display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" id="show-cover-index" ${post.show_cover_in_index ? 'checked' : ''}>
                                <label for="show-cover-index">在主页显示头图</label>
                            </div>
                            <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" id="show-cover-post" ${post.show_cover_in_post ? 'checked' : ''}>
                                <label for="show-cover-post">在文章显示头图</label>
                            </div>
                        </div>
                    </div>
                    <div class="table-wrapper" style="padding: 15px;">
                        <h3>附件管理</h3>
                        <div id="editor-attachments" style="margin-top: 10px; display: flex; flex-direction: column; gap: 10px;">
                            <label class="btn btn-block" style="cursor:pointer; text-align:center;">上传新附件<input type="file" style="display:none" onchange="app.uploadAttachment(this)"></label>
                            <div id="attachments-list" style="max-height: 200px; overflow-y: auto;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        setTimeout(() => { window.postEditor.init('post-content'); this.loadAttachments(); }, 100);
    }

    async savePost(id) {
        const title = document.getElementById('post-title').value;
        if (!title) return alert('标题不能为空');
        let slug = document.getElementById('post-slug').value;
        if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/(^-|-$)/g, '') || Date.now().toString();

        const tagsVal = document.getElementById('post-tags').value || '';
        const tags = tagsVal.split(/[,，]/).map(t => t.trim()).filter(Boolean);

        const payload = {
            title: title,
            content: window.postEditor.value(),
            status: document.getElementById('post-status').value,
            slug: slug,
            category_id: document.getElementById('post-category').value || null,
            cover_image: document.getElementById('post-cover-image').value || null,
            show_cover_in_index: document.getElementById('show-cover-index').checked ? 1 : 0,
            show_cover_in_post: document.getElementById('show-cover-post').checked ? 1 : 0,
            tags: tags
        };
        const createdAtVal = document.getElementById('post-created-at').value;
        if (createdAtVal) {
            payload.created_at = createdAtVal.replace('T', ' ') + ':00';
        }
        if (id) {
            await api.put('/posts/' + id, payload);
        } else {
            await api.post('/posts', payload);
        }
        alert('保存成功！');
        window.location.hash = '#posts';
    }

    async deletePost(id) {
        if(confirm('确定删除吗？')) {
            await api.delete(`/posts/${id}`);
            this.renderPosts();
        }
    }

    async renderCategories() {
        this.root.innerHTML = `<div class="page-header"><h2>分类目录</h2> <button class="btn" onclick="app.addCategory()">添加分类</button></div>`;
        const data = await api.get('/categories') || [];
        
        let html = `<div class="table-wrapper"><table><thead><tr><th>名称</th><th>缩略名</th><th>文章数</th><th>操作</th></tr></thead><tbody>`;
        data.forEach(c => {
            html += `<tr>
                <td>${c.name}</td>
                <td>${c.slug}</td>
                <td>0</td>
                <td><button class="action-btn danger" onclick="app.deleteCategory(${c.id})">删除</button></td>
            </tr>`;
        });
        html += `</tbody></table></div>`;
        this.root.innerHTML += html;
    }

    async addCategory() {
        const html = `
            <div class="form-group">
                <label>分类名称</label>
                <input type="text" id="modal-cat-name" class="form-control">
            </div>
            <div class="form-group">
                <label>缩略名 (可选，纯英文)</label>
                <input type="text" id="modal-cat-slug" class="form-control">
            </div>
        `;
        this.showModal('添加新分类', html, async () => {
            const name = document.getElementById('modal-cat-name').value;
            let slug = document.getElementById('modal-cat-slug').value;
            if (!name) return alert('分类名称不能为空');
            if (!slug) slug = name; // fallback
            await api.post('/categories', { name, slug });
            this.renderCategories();
        });
    }

    async deleteCategory(id) {
        if(confirm('确定删除吗？')) {
            await api.delete(`/categories/${id}`);
            this.renderCategories();
        }
    }

    async renderComments(page = 1) {
        this.root.innerHTML = `<div class="page-header"><h2>评论管理</h2></div>`;
        const data = await api.get(`/comments?page=${page}&limit=20`) || { comments: [], totalPages: 1 };
        
        let html = `<div class="table-wrapper"><table><thead><tr><th>作者</th><th>内容</th><th>状态</th><th>日期</th><th>操作</th></tr></thead><tbody>`;
        data.comments.forEach(c => {
            const statusBadge = c.status === 'approved' ? '<span style="color:#10b981">已通过</span>' : '<span style="color:#f59e0b">待审</span>';
            html += `<tr>
                <td><strong>${c.author_name}</strong><br><small>${c.author_email || ''}</small></td>
                <td style="max-width:300px;">${c.content}</td>
                <td>${statusBadge}</td>
                <td>${new Date(c.created_at).toLocaleDateString()}</td>
                <td>
                    ${c.status === 'pending' ? `<button class="action-btn" onclick="app.updateComment(${c.id}, 'approved', ${page})">通过</button>` : `<button class="action-btn" style="color:#f59e0b" onclick="app.updateComment(${c.id}, 'pending', ${page})">驳回</button>`}
                    <button class="action-btn" onclick="app.replyComment(${c.id}, ${c.post_id || 'null'}, ${c.page_id || 'null'})">回复</button>
                    <button class="action-btn danger" onclick="app.deleteComment(${c.id}, ${page})">删除</button>
                </td>
            </tr>`;
        });
        html += `</tbody></table></div>`;
        
        // Pagination controls
        if (data.totalPages > 1) {
            html += `<div class="pagination" style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">`;
            if (page > 1) html += `<button class="btn" onclick="app.renderComments(${page - 1})">上一页</button>`;
            html += `<span style="line-height: 38px;">第 ${page} / ${data.totalPages} 页</span>`;
            if (page < data.totalPages) html += `<button class="btn" onclick="app.renderComments(${page + 1})">下一页</button>`;
            html += `</div>`;
        }
        
        this.root.innerHTML += html;
    }
        html += `</tbody></table></div>`;
        this.root.innerHTML += html;
    }

    async updateComment(id, status, page = 1) {
        await api.put(`/comments/${id}/status`, { status });
        this.renderComments(page);
    }

    async deleteComment(id, page = 1) {
        if(confirm('确定删除此评论吗？')) {
            await api.delete(`/comments/${id}`);
            this.renderComments(page);
        }
    }

    async replyComment(id, post_id, page_id) {
        const content = prompt('请输入回复内容：');
        if (!content || !content.trim()) return;

        const settings = await api.get('/settings') || {};
        const author_name = settings.author_name || '管理员';
        const author_email = settings.admin_email || '';
        const author_url = settings.site_url || '';

        try {
            await api.post('/comments', {
                parent_id: id,
                post_id: post_id || null,
                page_id: page_id || null,
                author_name,
                author_email,
                author_url,
                content: content.trim()
            });
            alert('回复成功！');
            this.renderComments();
        } catch (e) {
            alert('回复失败');
        }
    }

    async renderPages() {
        this.root.innerHTML = `<div class="page-header"><h2>独立页面</h2> <a href="#page-editor" class="btn">新建页面</a></div>`;
        const data = await api.get('/pages');
        if (!data) return;

        let html = `<div class="table-wrapper"><table><thead><tr><th>标题</th><th>路径</th><th>排序</th><th>导航显示</th><th>操作</th></tr></thead><tbody>`;
        data.forEach(p => {
            html += `<tr>
                <td>${p.title}</td>
                <td>/page/${p.slug}</td>
                <td>${p.sort_order}</td>
                <td>${p.show_in_nav ? '是' : '否'}</td>
                <td><a href="#page-editor/${p.id}" class="action-btn">编辑</a> <button class="action-btn danger" onclick="app.deletePage(${p.id})">删除</button></td>
            </tr>`;
        });
        html += `</tbody></table></div>`;
        this.root.innerHTML += html;
    }

    async deletePage(id) {
        if(confirm('确定删除页面吗？')) {
            await api.delete(`/pages/${id}`);
            this.renderPages();
        }
    }

    async renderPageEditor() {
        this.currentEditorUploads = [];
        const hashParts = window.location.hash.split('/');
        const id = hashParts[1];
        let page = { title: '', slug: '', content: '', show_in_nav: true, sort_order: 0, cover_image: '', show_cover_in_post: false, show_sidebar: true };
        
        if (id) {
            const pages = await api.get('/pages');
            const found = pages.find(p => p.id == id);
            if (found) page = found;
        }

        this.root.innerHTML = `
            <div class="page-header">
                <h2>${id ? '编辑页面' : '新建页面'}</h2>
            </div>
            <div style="display:flex; gap: 20px;">
                <div style="flex: 3;">
                    <input type="text" id="page-title" class="form-control" placeholder="页面标题 (例如: 关于我)" value="${page.title}" style="font-size: 1.2rem; margin-bottom: 20px;">
                    <textarea id="page-content">${page.content || ''}</textarea>
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 20px;">
                    <div class="table-wrapper" style="padding: 15px;">
                        <h3>页面属性</h3>
                        <div style="margin-top: 15px;">
                            <label>URL缩略名：</label>
                            <input type="text" id="page-slug" class="form-control" style="margin-bottom:15px;" value="${page.slug || ''}" placeholder="例如: about">
                            
                            <label>导航显示：</label>
                            <select id="page-nav" class="form-control" style="margin-bottom:15px;">
                                <option value="1" ${page.show_in_nav ? 'selected' : ''}>是 (在主导航栏显示)</option>
                                <option value="0" ${!page.show_in_nav ? 'selected' : ''}>否</option>
                            </select>

                            <label>允许评论：</label>
                            <select id="page-allow-comments" class="form-control" style="margin-bottom:15px;">
                                <option value="1" ${page.allow_comments ? 'selected' : ''}>是</option>
                                <option value="0" ${!page.allow_comments ? 'selected' : ''}>否</option>
                            </select>

                            <label>显示侧边栏：</label>
                            <select id="page-show-sidebar" class="form-control" style="margin-bottom:15px;">
                                <option value="1" ${page.show_sidebar !== 0 ? 'selected' : ''}>是</option>
                                <option value="0" ${page.show_sidebar === 0 ? 'selected' : ''}>否</option>
                            </select>

                            <label>显示发布日期：</label>
                            <select id="page-show-date" class="form-control" style="margin-bottom:15px;">
                                <option value="1" ${page.show_date !== 0 ? 'selected' : ''}>是</option>
                                <option value="0" ${page.show_date === 0 ? 'selected' : ''}>否</option>
                            </select>

                            <label>发布时间：</label>
                            <input type="datetime-local" id="page-created-at" class="form-control" style="margin-bottom:15px;" value="${formatDatetimeLocal(page.created_at)}">

                            <label>排序权重：</label>
                            <input type="number" id="page-order" class="form-control" style="margin-bottom:15px;" value="${page.sort_order || 0}">

                            <button class="btn btn-block" onclick="app.savePage(${id || 'null'})">保存页面</button>
                        </div>
                    </div>
                    <div class="table-wrapper" style="padding: 15px;">
                        <h3>头图设置</h3>
                        <div style="margin-top: 10px;">
                            <img id="page-cover-preview" src="${page.cover_image || ''}" style="width:100%; max-height:120px; object-fit:cover; border-radius:4px; margin-bottom:10px; display: ${page.cover_image ? 'block' : 'none'};">
                            <input type="text" id="page-cover-image" class="form-control" style="margin-bottom:10px;" placeholder="输入图片链接或上传" value="${page.cover_image || ''}" oninput="document.getElementById('page-cover-preview').src = this.value; document.getElementById('page-cover-preview').style.display = this.value ? 'block' : 'none';">
                            <label class="btn btn-block" style="cursor:pointer; text-align:center;">上传头图<input type="file" style="display:none" accept="image/*" onchange="app.uploadCover(this, 'page')"></label>
                            
                            <div style="margin-top: 15px; display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" id="show-cover-post" ${page.show_cover_in_post ? 'checked' : ''}>
                                <label for="show-cover-post">在独立页面显示头图</label>
                            </div>
                        </div>
                    </div>
                    <div class="table-wrapper" style="padding: 15px;">
                        <h3>附件管理</h3>
                        <div id="editor-attachments" style="margin-top: 10px; display: flex; flex-direction: column; gap: 10px;">
                            <label class="btn btn-block" style="cursor:pointer; text-align:center;">上传新附件<input type="file" style="display:none" onchange="app.uploadAttachment(this)"></label>
                            <div id="attachments-list" style="max-height: 200px; overflow-y: auto;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        setTimeout(() => { window.postEditor.init('page-content'); this.loadAttachments(); }, 100);
    }

    async savePage(id) {
        const title = document.getElementById('page-title').value;
        if (!title) return alert('标题不能为空');
        let slug = document.getElementById('page-slug').value;
        if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/(^-|-$)/g, '') || Date.now().toString();

        const payload = {
            title: title,
            content: window.postEditor.value(),
            slug: slug,
            show_in_nav: document.getElementById('page-nav').value === '1',
            allow_comments: document.getElementById('page-allow-comments').value === '1',
            show_sidebar: document.getElementById('page-show-sidebar').value === '1' ? 1 : 0,
            show_date: document.getElementById('page-show-date').value === '1' ? 1 : 0,
            sort_order: parseInt(document.getElementById('page-order').value) || 0,
            cover_image: document.getElementById('page-cover-image').value || null,
            show_cover_in_post: document.getElementById('show-cover-post').checked ? 1 : 0
        };
        const createdAtVal = document.getElementById('page-created-at').value;
        if (createdAtVal) {
            payload.created_at = createdAtVal.replace('T', ' ') + ':00';
        }
        if (id) {
            await api.put('/pages/' + id, payload);
        } else {
            await api.post('/pages', payload);
        }
        alert('保存成功！');
        window.location.hash = '#pages';
    }

    async loadAttachments() {
        const list = document.getElementById('attachments-list');
        if (!list) return;
        if (!this.currentEditorUploads || this.currentEditorUploads.length === 0) {
            list.innerHTML = '<div style="color:var(--admin-text-muted); font-size:0.9rem; text-align:center; margin-top:10px;">暂无本次编辑上传的附件</div>';
            return;
        }
        list.innerHTML = this.currentEditorUploads.map(f => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 0; border-bottom:1px solid var(--admin-border);">
                <span style="font-size:0.85rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:140px;" title="${f.name}">${f.name}</span>
                <button class="action-btn" onclick="app.insertAttachment('${f.url}', '${f.name}')">插入</button>
            </div>
        `).join('');
    }

    async uploadAttachment(input) {
        if (!input.files || !input.files[0]) return;
        const label = input.parentNode;
        label.innerHTML = '上传中...';
        const res = await api.uploadImage(input.files[0]);
        if (res && res.url) {
            if (!this.currentEditorUploads) this.currentEditorUploads = [];
            this.currentEditorUploads.push({ name: res.name || input.files[0].name, url: res.url });
        }
        this.loadAttachments();
        const wrapper = document.getElementById('editor-attachments');
        if (wrapper) wrapper.querySelector('.btn').innerHTML = '上传新附件<input type="file" style="display:none" onchange="app.uploadAttachment(this)">';
    }

    insertAttachment(url, name) {
        if (!window.postEditor || !window.postEditor.mde) return;
        const isImage = name.match(/\.(jpeg|jpg|gif|png|webp)$/i);
        const md = isImage ? `![${name}](${url})` : `[${name}](${url})`;
        const pos = window.postEditor.mde.codemirror.getCursor();
        window.postEditor.mde.codemirror.replaceRange(md, pos);
    }

    async uploadCover(input, targetType = 'post') {
        if (!input.files || !input.files[0]) return;
        const label = input.parentNode;
        label.innerHTML = '上传中...';
        try {
            const res = await api.uploadImage(input.files[0]);
            if (res && res.url) {
                document.getElementById(`${targetType}-cover-image`).value = res.url;
                const preview = document.getElementById(`${targetType}-cover-preview`);
                preview.src = res.url;
                preview.style.display = 'block';
            }
        } catch (e) {
            alert('上传头图失败');
        }
        label.innerHTML = `上传头图<input type="file" style="display:none" accept="image/*" onchange="app.uploadCover(this, '${targetType}')">`;
    }

    async renderFiles() {
        this.root.innerHTML = `<div class="page-header"><h2>文件管理</h2> <label class="btn" style="cursor:pointer">上传文件<input type="file" style="display:none" onchange="app.uploadStandaloneFile(this)"></label></div>`;
        const data = await api.get('/uploads') || [];
        
        let html = `<div class="table-wrapper"><table><thead><tr><th>缩略图</th><th>文件名</th><th>大小</th><th>日期</th><th>操作</th></tr></thead><tbody>`;
        data.forEach(f => {
            const isImage = f.name.match(/\.(jpeg|jpg|gif|png|webp)$/i);
            const thumb = isImage ? `<img src="${f.url}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">` : '<div style="font-size:24px;">📄</div>';
            html += `<tr>
                <td>${thumb}</td>
                <td style="max-width:200px; word-wrap:break-word;">${f.name}</td>
                <td>${(f.size / 1024).toFixed(2)} KB</td>
                <td>${new Date(f.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="action-btn" onclick="navigator.clipboard.writeText(window.location.origin + '${f.url}'); alert('链接已复制！')">复制链接</button>
                    <button class="action-btn danger" onclick="app.deleteFile('${f.name}')">删除</button>
                </td>
            </tr>`;
        });
        html += `</tbody></table></div>`;
        this.root.innerHTML += html;
    }

    async uploadStandaloneFile(input) {
        if (!input.files || !input.files[0]) return;
        await api.uploadImage(input.files[0]);
        this.renderFiles();
    }

    async deleteFile(name) {
        if(confirm('确定删除此文件吗？无法恢复！')) {
            await api.delete('/uploads/' + name);
            this.renderFiles();
        }
    }

    async renderSettings() {
        this.root.innerHTML = `<div class="page-header"><h2>系统设置</h2></div>`;
        const settings = await api.get('/settings');
        const themes = await api.get('/themes') || [];
        if(!settings) return;

        const themeOptions = themes.map(t => 
            `<option value="${t.slug}" ${settings.active_theme === t.slug ? 'selected' : ''}>${t.name} (v${t.version})</option>`
        ).join('');

        this.root.innerHTML += `
            <div class="table-wrapper" style="padding:30px; max-width:600px; margin-bottom: 30px;">
                <h3>账号安全</h3>
                <div class="form-group" style="margin-top:15px;">
                    <label>用户名</label>
                    <input type="text" id="profile_username" class="form-control" value="${window.adminUser ? window.adminUser.username : ''}">
                </div>
                <div class="form-group">
                    <label>当前密码（必填）</label>
                    <input type="password" id="profile_old_password" class="form-control" placeholder="必须输入当前密码才能修改账号信息">
                </div>
                <div class="form-group">
                    <label>新密码（留空则不修改密码）</label>
                    <input type="password" id="profile_new_password" class="form-control">
                </div>
                <div class="form-group">
                    <label>确认新密码</label>
                    <input type="password" id="profile_confirm_password" class="form-control">
                </div>
                <button class="btn" onclick="app.saveProfile()">修改账号信息</button>
            </div>

            <div class="table-wrapper" style="padding:30px; max-width:600px;">
                <h3>站点基础信息</h3>
                <div class="form-group" style="margin-top:15px;">
                    <label>站点名称</label>
                    <input type="text" id="site_title" class="form-control" value="${settings.site_title || ''}">
                </div>
                <div class="form-group">
                    <label>站点地址 (URL)</label>
                    <input type="url" id="site_url" class="form-control" value="${settings.site_url || 'https://blog.bgsnd.com'}" placeholder="例如: https://blog.bgsnd.com">
                </div>
                <div class="form-group">
                    <label>站点描述</label>
                    <input type="text" id="site_desc" class="form-control" value="${settings.site_description || 'Happy'}">
                </div>
                <div class="form-group">
                    <label>关键词</label>
                    <input type="text" id="site_keywords" class="form-control" value="${settings.site_keywords || 'typecho,php,blog'}" placeholder="请以半角逗号 , 分割多个关键字">
                </div>

                <hr style="border:0; border-top:1px solid var(--admin-border); margin: 25px 0;">
                <h3>博主资料设置</h3>
                <div class="form-group" style="margin-top:15px;">
                    <label>博主昵称</label>
                    <input type="text" id="author_name" class="form-control" value="${settings.author_name || 'Admin'}">
                </div>
                <div class="form-group">
                    <label>博主个人简介</label>
                    <input type="text" id="author_bio" class="form-control" value="${settings.author_bio || '热爱代码与生活的创造者。'}">
                </div>
                <div class="form-group">
                    <label>管理员邮箱</label>
                    <input type="email" id="admin_email" class="form-control" value="${settings.admin_email || ''}" placeholder="用于接收通知及Gravatar头像">
                </div>
                <div class="form-group">
                    <label>头像模式</label>
                    <select id="avatar_mode" class="form-control" onchange="document.getElementById('avatar_custom_wrapper').style.display = this.value === 'custom' ? 'block' : 'none'">
                        <option value="text" ${settings.avatar_mode === 'text' ? 'selected' : ''}>文字首字母 (默认)</option>
                        <option value="gravatar" ${settings.avatar_mode === 'gravatar' ? 'selected' : ''}>Gravatar (通过邮箱)</option>
                        <option value="custom" ${settings.avatar_mode === 'custom' ? 'selected' : ''}>自定义图片URL</option>
                    </select>
                </div>
                <div class="form-group" id="avatar_custom_wrapper" style="display: ${settings.avatar_mode === 'custom' ? 'block' : 'none'}">
                    <label>自定义头像URL</label>
                    <input type="text" id="avatar_custom_url" class="form-control" value="${settings.avatar_custom_url || ''}">
                </div>

                <hr style="border:0; border-top:1px solid var(--admin-border); margin: 25px 0;">
                <h3>页脚设置</h3>
                <div class="form-group" style="margin-top:15px;">
                    <label>底部版权与自定义内容 (支持直接填入HTML代码)</label>
                    <textarea id="footer_html" class="form-control" style="height: 80px; resize: vertical;" placeholder="例如: <p>&copy; 2026 我的博客 | <a href='https://beian.miit.gov.cn/'>京ICP备123456号</a></p>">${settings.footer_html || ''}</textarea>
                </div>

                <hr style="border:0; border-top:1px solid var(--admin-border); margin: 25px 0;">
                <h3>外观设置</h3>
                <div class="form-group" style="margin-top:15px;">
                    <label>博客前台主题</label>
                    <select id="active_theme" class="form-control">
                        ${themeOptions}
                    </select>
                </div>
                <div class="form-group" style="margin-top:15px;">
                    <label>后台颜色模式</label>
                    <select id="admin_theme_mode" class="form-control">
                        <option value="light" ${settings.admin_theme_mode === 'light' ? 'selected' : ''}>浅色模式 (Light)</option>
                        <option value="dark" ${settings.admin_theme_mode === 'dark' ? 'selected' : ''}>深色模式 (Dark)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>后台主色调</label>
                    <input type="color" id="admin_theme_color" value="${settings.admin_theme_color || '#0ea5e9'}" style="width:100%; height:40px; border:none; background:none; cursor:pointer;">
                </div>
                <button class="btn" style="margin-top:15px;" onclick="app.saveSettings()">保存设置</button>
            </div>
        `;
    }

    async saveProfile() {
        const username = document.getElementById('profile_username').value;
        const oldPassword = document.getElementById('profile_old_password').value;
        const newPassword = document.getElementById('profile_new_password').value;
        const confirmPassword = document.getElementById('profile_confirm_password').value;

        if (!oldPassword) {
            return alert('请输入当前密码进行验证！');
        }
        if (newPassword && newPassword !== confirmPassword) {
            return alert('两次输入的新密码不一致！');
        }

        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                },
                body: JSON.stringify({ username, oldPassword, newPassword })
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.error || '修改失败');
            } else {
                alert('账号信息修改成功，请重新登录！');
                app.logout();
            }
        } catch (err) {
            alert('网络错误');
        }
    }

    async saveSettings() {
        const payload = {
            site_title: document.getElementById('site_title').value,
            site_url: document.getElementById('site_url').value,
            site_description: document.getElementById('site_desc').value,
            site_keywords: document.getElementById('site_keywords').value,
            author_name: document.getElementById('author_name').value,
            author_bio: document.getElementById('author_bio').value,
            admin_email: document.getElementById('admin_email').value,
            avatar_mode: document.getElementById('avatar_mode').value,
            avatar_custom_url: document.getElementById('avatar_custom_url').value,
            footer_html: document.getElementById('footer_html').value,
            active_theme: document.getElementById('active_theme').value,
            admin_theme_mode: document.getElementById('admin_theme_mode').value,
            admin_theme_color: document.getElementById('admin_theme_color').value
        };
        await api.put('/settings', payload);
        if (window.applyAdminTheme) window.applyAdminTheme(payload);
        alert('设置已保存！界面已刷新。');
    }

    renderThemes() {
        // Delegated to ThemeManager
        window.themeManager.render(this.root);
    }
}

const app = new App();
