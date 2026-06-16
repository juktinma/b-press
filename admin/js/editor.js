// editor.js
class Editor {
    constructor() {
        this.mde = null;
    }

    init(textareaId) {
        if (this.mde) {
            this.mde.toTextArea();
            this.mde = null;
        }

        const self = this;

        this.mde = new EasyMDE({
            element: document.getElementById(textareaId),
            spellChecker: false,
            autosave: {
                enabled: false,
            },
            status: ["lines", "words", "cursor"],
            minHeight: "400px",
            uploadImage: true,
            imageAccept: "image/png, image/jpeg, image/gif, image/webp",
            imageUploadFunction: async (file, onSuccess, onError) => {
                try {
                    const res = await api.uploadImage(file);
                    if (res && res.url) {
                        onSuccess(res.url);
                    } else {
                        onError("上传失败");
                    }
                } catch (e) {
                    onError("上传出错");
                }
            },
            toolbar: [
                "bold", "italic", "heading", "|",
                "quote", "unordered-list", "ordered-list", "|",
                "link",
                {
                    name: "image",
                    action: function customImageAction(editor) {
                        self.showImageDialog(editor);
                    },
                    className: "fa fa-image",
                    title: "插入图片",
                },
                {
                    name: "upload-image",
                    action: function customUploadAction(editor) {
                        // Trigger file picker for local upload
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/png, image/jpeg, image/gif, image/webp';
                        input.onchange = async () => {
                            if (!input.files || !input.files[0]) return;
                            try {
                                const res = await api.uploadImage(input.files[0]);
                                if (res && res.url) {
                                    const cm = editor.codemirror;
                                    const pos = cm.getCursor();
                                    cm.replaceRange(`![${input.files[0].name}](${res.url})`, pos);
                                } else {
                                    alert('上传失败');
                                }
                            } catch (e) {
                                alert('上传出错');
                            }
                        };
                        input.click();
                    },
                    className: "fa fa-upload",
                    title: "上传本地图片",
                },
                "|",
                "preview", "side-by-side", "fullscreen", "|",
                "guide"
            ]
        });
    }

    showImageDialog(editor) {
        const url = prompt('请输入图片地址 (URL)：', 'https://');
        if (!url || url === 'https://') return;
        const alt = prompt('请输入图片描述（可选）：', '') || '图片';
        const cm = editor.codemirror;
        const pos = cm.getCursor();
        cm.replaceRange(`![${alt}](${url})`, pos);
    }

    value(val) {
        if (val !== undefined) {
            this.mde.value(val);
        }
        return this.mde.value();
    }
}

window.postEditor = new Editor();
