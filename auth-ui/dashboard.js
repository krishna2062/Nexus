document.addEventListener('DOMContentLoaded', () => {
    const authUser = localStorage.getItem('auth_user');
    const authName = localStorage.getItem('auth_name');

    if(!authUser) {
        window.location.href = 'index.html';
        return;
    }

    const displayName = authName || authUser;
    
    // Set Profile Names/Images across the dashboard
    document.getElementById('nav-profile-name').textContent = displayName;
    document.getElementById('side-profile-name').textContent = displayName;
    document.getElementById('main-profile-name').textContent = displayName;
    
    const userAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1877f2&color=fff`;
    document.getElementById('nav-profile-img').src = userAvatarUrl;
    document.getElementById('side-profile-img').src = userAvatarUrl;
    document.getElementById('main-profile-img').src = userAvatarUrl;
    document.getElementById('post-profile-img').src = userAvatarUrl;
    document.getElementById('story-profile-img').src = userAvatarUrl;

    const myAvatarImgs = document.querySelectorAll('.my-avatar');
    myAvatarImgs.forEach(img => img.src = userAvatarUrl);

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_name');
        window.location.href = 'index.html';
    });

    // Navigation (SPA logic)
    const navIcons = document.querySelectorAll('.nav-icon, .profile-nav, .sidebar-item[data-target], .contact-item[data-target]');
    const pageSections = document.querySelectorAll('.page-section');

    navIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const targetId = icon.getAttribute('data-target');
            if(!targetId) return;

            // Remove active from navs
            document.querySelectorAll('.nav-icon').forEach(n => n.classList.remove('active'));
            if(icon.classList.contains('nav-icon')) icon.classList.add('active');

            // Hide all sections, show target
            pageSections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            // If profile section, clone feed posts
            if(targetId === 'profile-section') {
                const profileContainer = document.getElementById('profile-posts-container');
                profileContainer.innerHTML = '';
                const myPosts = document.querySelectorAll('.post.my-post');
                if(myPosts.length === 0) {
                    profileContainer.innerHTML = '<p style="text-align:center; color:gray; padding:20px;">No posts yet. Go to Feed and create one!</p>';
                } else {
                    myPosts.forEach(p => {
                        profileContainer.appendChild(p.cloneNode(true));
                    });
                }
            }
        });
    });

    // Create Post Logic
    const postInput = document.getElementById('post-input');
    const submitPostBtn = document.getElementById('submit-post-btn');
    const feedPosts = document.getElementById('feed-posts');

    postInput.addEventListener('input', () => {
        if(postInput.value.trim().length > 0) {
            submitPostBtn.style.display = 'block';
        } else {
            submitPostBtn.style.display = 'none';
        }
    });

    submitPostBtn.addEventListener('click', () => {
        const text = postInput.value.trim();
        if(!text) return;

        const newPost = document.createElement('div');
        newPost.className = 'post my-post';
        newPost.innerHTML = `
            <div class="post-header">
                <img src="${userAvatarUrl}" alt="User">
                <div class="post-info">
                    <h3>${displayName}</h3>
                    <span>Just now</span>
                </div>
                <i class="ri-more-fill"></i>
            </div>
            <div class="post-content">
                <p>${text}</p>
            </div>
            <div class="post-stats">
                <div class="likes-count"><i class="ri-thumb-up-fill" style="color: #1877f2;"></i> <span class="count">0</span></div>
                <div class="comments-count">0 Comments</div>
            </div>
            <div class="post-actions">
                <div class="action-btn like-btn"><i class="ri-thumb-up-line"></i> Like</div>
                <div class="action-btn comment-btn"><i class="ri-chat-1-line"></i> Comment</div>
                <div class="action-btn share-btn"><i class="ri-share-forward-line"></i> Share</div>
            </div>
            <div class="comments-section" style="display: none;">
                <div class="comment-input-area">
                    <img src="${userAvatarUrl}">
                    <input type="text" placeholder="Write a comment..." class="comment-input">
                </div>
                <div class="comments-list"></div>
            </div>
        `;

        feedPosts.insertBefore(newPost, feedPosts.firstChild);
        postInput.value = '';
        submitPostBtn.style.display = 'none';
        attachPostEvents(newPost);
    });

    // Event Delegation for existing and new posts
    function attachPostEvents(postElement) {
        // Like Post
        const likeBtn = postElement.querySelector('.like-btn');
        const countSpan = postElement.querySelector('.likes-count .count');
        likeBtn.addEventListener('click', () => {
            let count = parseInt(countSpan.textContent);
            if(likeBtn.classList.contains('liked')) {
                likeBtn.classList.remove('liked');
                likeBtn.innerHTML = '<i class="ri-thumb-up-line"></i> Like';
                count--;
            } else {
                likeBtn.classList.add('liked');
                likeBtn.innerHTML = '<i class="ri-thumb-up-fill"></i> Liked';
                count++;
            }
            countSpan.textContent = count;
        });

        // Comment Toggle
        const commentBtn = postElement.querySelector('.comment-btn');
        const commentSection = postElement.querySelector('.comments-section');
        commentBtn.addEventListener('click', () => {
            commentSection.style.display = commentSection.style.display === 'none' ? 'block' : 'none';
        });

        // Submit Comment
        const commentInput = postElement.querySelector('.comment-input');
        const commentsList = postElement.querySelector('.comments-list');
        const commentCountTxt = postElement.querySelector('.comments-count');
        
        commentInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter' && commentInput.value.trim() !== '') {
                const commentText = commentInput.value.trim();
                const newComment = document.createElement('div');
                newComment.className = 'comment';
                newComment.innerHTML = `
                    <img src="${userAvatarUrl}">
                    <div class="comment-body">
                        <strong>${displayName}</strong>
                        <p>${commentText}</p>
                    </div>
                `;
                commentsList.appendChild(newComment);
                commentInput.value = '';
                
                // Update count
                const currentCount = parseInt(commentCountTxt.textContent) || 0;
                commentCountTxt.textContent = `${currentCount + 1} Comments`;
            }
        });

        // Share
        const shareBtn = postElement.querySelector('.share-btn');
        shareBtn.addEventListener('click', () => {
            alert('Post shared to your timeline!');
        });
    }

    // Attach events to default posts
    document.querySelectorAll('.post').forEach(attachPostEvents);

    // Create Story Modal Logic
    const storyModal = document.getElementById('story-modal');
    const createStoryBtn = document.getElementById('create-story-btn');
    const closeStoryModal = document.querySelector('.close-modal');
    const postStoryBtn = document.getElementById('post-story-btn');
    const storyText = document.getElementById('story-text');
    const storyImgUrl = document.getElementById('story-img-url');
    const storiesWrapper = document.querySelector('.stories-wrapper');

    createStoryBtn.addEventListener('click', () => {
        storyModal.classList.add('active');
    });

    closeStoryModal.addEventListener('click', () => {
        storyModal.classList.remove('active');
    });

    postStoryBtn.addEventListener('click', () => {
        const text = storyText.value.trim();
        const img = storyImgUrl.value.trim();
        
        if(!text && !img) return;

        const newStory = document.createElement('div');
        newStory.className = 'story';
        const bgImg = img ? img : `https://picsum.photos/200/300?random=${Math.random()}`;
        
        newStory.innerHTML = `
            <img src="${bgImg}" class="story-bg">
            <img src="${userAvatarUrl}" class="story-profile">
            <p>${displayName}</p>
        `;
        
        // Insert after the "Create Story" button
        storiesWrapper.insertBefore(newStory, createStoryBtn.nextSibling);

        // Reset and close
        storyText.value = '';
        storyImgUrl.value = '';
        storyModal.classList.remove('active');
    });

    // Reels like button
    document.querySelectorAll('.reel-action.like-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const span = btn.querySelector('span');
            let txt = span.textContent;
            if(btn.classList.contains('liked')) {
                btn.classList.remove('liked');
                btn.querySelector('i').className = 'ri-heart-line';
                span.textContent = txt.replace('k', '') - 0.1 + 'k';
            } else {
                btn.classList.add('liked');
                btn.querySelector('i').className = 'ri-heart-fill';
                if(txt.includes('k')) span.textContent = (parseFloat(txt) + 0.1).toFixed(1) + 'k';
                else span.textContent = parseInt(txt) + 1;
            }
        });
    });

    // Chat Logic
    const chatInput = document.getElementById('chat-input-msg');
    const sendMsgBtn = document.getElementById('send-msg-btn');
    const chatMessages = document.querySelector('.chat-messages');

    function sendChatMessage() {
        const text = chatInput.value.trim();
        if(text) {
            const msg = document.createElement('div');
            msg.className = 'message sent';
            msg.textContent = text;
            chatMessages.appendChild(msg);
            chatInput.value = '';
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Simulate reply
            setTimeout(() => {
                const reply = document.createElement('div');
                reply.className = 'message received';
                reply.textContent = "That's cool! 😎";
                chatMessages.appendChild(reply);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 1000);
        }
    }

    sendMsgBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') sendChatMessage();
    });
});
