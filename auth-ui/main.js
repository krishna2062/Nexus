document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = await DB.getCurrentUser();
    if(!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    // Pre-fetch all users for performance
    

    // Inject mobile search UI
    const searchHTML = `
    <div class="modal-overlay" id="mobile-search-modal">
        <div class="modal-card" style="width: 100%; height: 100%; border-radius: 0; display: flex; flex-direction: column; max-width: none;">
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <input type="text" id="mobile-search-input" placeholder="Search friends..." style="flex: 1; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-color); color: white;">
                <button class="btn-secondary" onclick="document.getElementById('mobile-search-modal').classList.remove('active')"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div id="mobile-search-results" style="flex: 1; overflow-y: auto;">
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', searchHTML);

    const mSearchInput = document.getElementById('mobile-search-input');
    const mSearchResults = document.getElementById('mobile-search-results');
    
    if (mSearchInput) {
        let mSearchTimer; mSearchInput.addEventListener('input', (e) => { clearTimeout(mSearchTimer); mSearchTimer = setTimeout(async () => {
            const query = e.target.value.toLowerCase();
            mSearchResults.innerHTML = '';
            if(!query) return;
            
            const matches = await DB.searchUsers(query);
            matches.forEach(u => {
                mSearchResults.innerHTML += `
                <div class="user-item" onclick="window.location.href='profile.html?id=${u.id}'" style="display: flex; align-items: center; gap: 10px; padding: 10px; border-bottom: 1px solid var(--border); cursor: pointer;">
                    <img src="${u.profile_pic || 'https://ui-avatars.com/api/?name='+u.fullname}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    <strong style="color: white;">${u.fullname}</strong>
                </div>`;
            });
        }, 300); });
    }

    // Desktop search
    const dSearchInput = document.getElementById('search-input');
    const dSearchResults = document.getElementById('search-results');
    if (dSearchInput && dSearchResults) {
        let dSearchTimer; dSearchInput.addEventListener('input', (e) => { clearTimeout(dSearchTimer); dSearchTimer = setTimeout(async () => {
            const query = e.target.value.toLowerCase();
            dSearchResults.innerHTML = '';
            if(!query) {
                dSearchResults.style.display = 'none';
                return;
            }
            dSearchResults.style.display = 'block';
            
            const matches = await DB.searchUsers(query);
            if(matches.length === 0) {
                dSearchResults.innerHTML = '<div style="padding: 10px; color: var(--text-secondary);">No results found</div>';
                return;
            }
            matches.forEach(u => {
                dSearchResults.innerHTML += `
                <div class="user-item" onclick="window.location.href='profile.html?id=${u.id}'" style="display: flex; align-items: center; gap: 10px; padding: 10px; border-bottom: 1px solid var(--border); cursor: pointer; color: white;">
                    <img src="${u.profile_pic || 'https://ui-avatars.com/api/?name='+u.fullname}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">
                    <strong>${u.fullname}</strong>
                </div>`;
            });
        }, 300); });
        
        document.addEventListener('click', (e) => {
            if(!e.target.closest('.search-box')) {
                dSearchResults.style.display = 'none';
            }
        });
    }

    // Populate Sidebar Profile & Following List
    document.querySelectorAll('.my-profile-pic').forEach(el => el.src = currentUser.profilePic);
    
    const followingListEl = document.getElementById('following-list');
    if(followingListEl) {
        followingListEl.innerHTML = '';
        if(currentUser.following && currentUser.following.length > 0) {
            for (const id of currentUser.following) {
                const users = await DB.getUsersByIds([id]); const u = users[0];
                if(u) {
                    followingListEl.innerHTML += `
                    <div class="user-item" onclick="window.location.href='profile.html?id=${u.id}'">
                        <img src="${u.profile_pic || 'https://ui-avatars.com/api/?name='+u.fullname}">
                        <div class="user-item-info">
                            <strong>${u.fullname}</strong>
                        </div>
                    </div>`;
                }
            }
        } else {
            followingListEl.innerHTML = '<p style="color:var(--text-secondary); padding-left:12px; font-size:0.85rem;">You are not following anyone yet.</p>';
        }
    }

    // Active Sidebar Link
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
    
    if (currentPath === 'dashboard.html') {
        const urlParams = new URLSearchParams(window.location.search);
        const feedType = urlParams.get('feed') || 'foryou';
        if (feedType === 'following') {
            document.getElementById('nav-following')?.classList.add('active');
        } else {
            document.getElementById('nav-foryou')?.classList.add('active');
        }
    } else {
        document.querySelectorAll('.sidebar-item').forEach(el => {
            if(el.getAttribute('href') === currentPath) el.classList.add('active');
        });
    }

    // Render Videos on Dashboard
    const feedContainer = document.getElementById('video-feed');
    if(feedContainer) {
        feedContainer.innerHTML = '';
        let videos = await DB.getVideos();
        
        const urlParams = new URLSearchParams(window.location.search);
        const feedType = urlParams.get('feed') || 'foryou';
        
        if (feedType === 'following') {
            videos = videos.filter(v => currentUser.following && currentUser.following.includes(v.userId));
        }

        if(videos.length === 0) {
            feedContainer.innerHTML = '<div style="text-align:center; padding:50px;">No videos to show here.</div>';
        }

        // Fetch all users once for performance
        

        for (const vid of videos) {
            const user = vid.user;
            if(!user) continue;
            const isLiked = vid.likes.includes(currentUser.id);
            const isFollowing = currentUser.following && currentUser.following.includes(user.id);
            const hasRequested = user.pendingFollowers && user.pendingFollowers.includes(currentUser.id);
            
            let followBtnHtml = '';
            if(user.id !== currentUser.id && !isFollowing) {
                if(hasRequested) {
                    followBtnHtml = `<button class="follow-btn-small" style="background:#444; width:auto; padding:0 5px; border-radius:10px;">Requested</button>`;
                } else {
                    followBtnHtml = `<button class="follow-btn-small" onclick="followUserFromFeed('${user.id}')"><i class="fa-solid fa-plus"></i></button>`;
                }
            }

            let captionHtml = vid.caption;
            if (vid.mentioned_user_id) {
                const mentionedUser = (await DB.getUsersByIds([vid.mentioned_user_id]))[0];
                if (mentionedUser) {
                    captionHtml += ` <span style="color:var(--primary); font-weight:bold; cursor:pointer;" onclick="window.location.href='profile.html?id=${mentionedUser.id}'">@${mentionedUser.fullname.replace(/\s+/g, '').toLowerCase()}</span>`;
                }
            }

            const videoHtml = `
            <div class="video-container" data-id="${vid.id}">
                <video src="${vid.videoUrl}" class="video-player" loop></video>
                <div class="video-info">
                    <h3 onclick="window.location.href='profile.html?id=${user.id}'">@${user.fullname.replace(/\s+/g, '').toLowerCase()}</h3>
                    <p>${captionHtml}</p>
                    <div class="music-ticker"><i class="fa-solid fa-music"></i> Original Sound - ${user.fullname}</div>
                </div>
                <div class="action-sidebar">
                    <div class="profile-action">
                        <img src="${user.profilePic}" onclick="window.location.href='profile.html?id=${user.id}'">
                        ${followBtnHtml}
                    </div>
                    <div class="action-btn like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${vid.id}', this)">
                        <div class="icon-circle"><i class="fa-solid fa-heart"></i></div>
                        <span class="likes-count">${vid.likes.length}</span>
                    </div>
                    <div class="action-btn comment-btn" onclick="openComments('${vid.id}')">
                        <div class="icon-circle"><i class="fa-solid fa-comment-dots"></i></div>
                        <span class="comments-count">${vid.comments.length}</span>
                    </div>
                    <div class="action-btn share-btn" onclick="alert('Link copied!')">
                        <div class="icon-circle"><i class="fa-solid fa-share"></i></div>
                        <span>Share</span>
                    </div>
                </div>
            </div>`;
            feedContainer.insertAdjacentHTML('beforeend', videoHtml);
        }

        // Intersection Observer for autoplay
        const videosElements = document.querySelectorAll('.video-player');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if(entry.isIntersecting) {
                    entry.target.play().catch(e => console.log('Autoplay prevented'));
                } else {
                    entry.target.pause();
                }
            });
        }, { threshold: 0.6 });
        
        videosElements.forEach(v => {
            observer.observe(v);
            v.addEventListener('click', () => {
                if(v.paused) v.play();
                else v.pause();
            });
        });
    }

    // Profile Page Logic
    if(window.location.pathname.includes('profile.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const viewId = urlParams.get('id') || currentUser.id;
        const viewUser = await DB.getUser(viewId);
        
        if(viewUser) {
            document.getElementById('profile-img').src = viewUser.profilePic;
            document.getElementById('profile-username').textContent = '@' + viewUser.fullname.replace(/\s+/g, '').toLowerCase();
            document.getElementById('profile-fullname').textContent = viewUser.fullname;
            document.getElementById('profile-bio').textContent = viewUser.bio || 'No bio yet.';
            
            document.getElementById('count-following').textContent = (viewUser.following || []).length;
            document.getElementById('count-followers').textContent = (viewUser.followers || []).length;
            
            const allVideos = await DB.getVideos();
            const userVideos = allVideos.filter(v => v.userId === viewId);
            const totalLikes = userVideos.reduce((sum, v) => sum + v.likes.length, 0);
            document.getElementById('count-likes').textContent = totalLikes;

            const actionBtn = document.getElementById('profile-action-btn');
            const msgBtn = document.getElementById('profile-message-btn');

            if(viewId === currentUser.id) {
                actionBtn.textContent = 'Edit profile';
                actionBtn.style.background = 'var(--surface)';
                actionBtn.style.border = '1px solid var(--border)';
                actionBtn.addEventListener('click', () => {
                    document.getElementById('edit-profile-modal').classList.add('active');
                    document.getElementById('edit-name').value = currentUser.fullname;
                    document.getElementById('edit-bio').value = currentUser.bio || '';
                });
            } else {
                const isFollowing = currentUser.following && currentUser.following.includes(viewId);
                const hasRequested = viewUser.pendingFollowers && viewUser.pendingFollowers.includes(currentUser.id);
                
                if(isFollowing) {
                    actionBtn.textContent = 'Following';
                    actionBtn.style.background = 'var(--surface)';
                    actionBtn.style.border = '1px solid var(--border)';
                    msgBtn.style.display = 'block';
                    msgBtn.onclick = () => window.location.href = `chat.html?user=${viewId}`;
                    
                    actionBtn.onclick = async () => {
                        await DB.unfollow(currentUser.id, viewId);
                        window.location.reload();
                    };
                } else if(hasRequested) {
                    actionBtn.textContent = 'Requested';
                    actionBtn.style.background = 'var(--surface)';
                    actionBtn.style.border = '1px solid var(--border)';
                } else {
                    actionBtn.textContent = 'Follow';
                    actionBtn.addEventListener('click', async () => {
                        await DB.requestFollow(currentUser.id, viewId);
                        window.location.reload();
                    });
                }
            }

            // Render Videos
            const grid = document.getElementById('profile-video-grid');
            if(userVideos.length === 0) {
                grid.innerHTML = '<p style="grid-column: 1 / -1; text-align:center; color:var(--text-secondary); padding:40px;">No videos uploaded yet.</p>';
            } else {
                userVideos.forEach(v => {
                    let deleteBtn = '';
                    if (viewId === currentUser.id) {
                        deleteBtn = `<div onclick="deleteVideo('${v.id}')" style="position:absolute; top:5px; right:5px; background:rgba(255,0,0,0.7); padding:5px 8px; border-radius:5px; font-size:0.8rem; z-index:10; cursor:pointer;"><i class="fa-solid fa-trash"></i></div>`;
                    }
                    grid.innerHTML += `
                    <div class="grid-item">
                        <video src="${v.videoUrl}" onclick="window.location.href='dashboard.html'"></video>
                        ${deleteBtn}
                        <div class="views" style="bottom:10px; left:10px;"><i class="fa-solid fa-heart"></i> ${v.likes.length} &nbsp; <i class="fa-solid fa-comment"></i> ${v.comments.length}</div>
                    </div>`;
                });
            }
        }

        // Edit Profile Logic
        const closeEditBtn = document.getElementById('close-edit-modal');
        if(closeEditBtn) closeEditBtn.addEventListener('click', () => document.getElementById('edit-profile-modal').classList.remove('active'));
        
        const editForm = document.getElementById('edit-profile-form');
        if(editForm) {
            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('edit-name').value.trim();
                const bio = document.getElementById('edit-bio').value.trim();
                const picFile = document.getElementById('edit-pic').files[0];

                const updates = { fullname: name, bio: bio };

                if(picFile) {
                    const reader = new FileReader();
                    reader.onload = async function(evt) {
                        updates.profile_pic = evt.target.result;
                        await DB.updateUser(currentUser.id, updates);
                        window.location.reload();
                    };
                    reader.readAsDataURL(picFile);
                } else {
                    await DB.updateUser(currentUser.id, updates);
                    window.location.reload();
                }
            });
        }
    }

    // Inbox Logic
    if(window.location.pathname.includes('inbox.html')) {
        const tabNotif = document.getElementById('tab-notifications');
        const tabReq = document.getElementById('tab-requests');
        const viewNotif = document.getElementById('view-notifications');
        const viewReq = document.getElementById('view-requests');
        const reqList = document.getElementById('requests-list');

        // Render requests
        const pending = currentUser.pendingFollowers || [];
        document.getElementById('req-count').textContent = pending.length;

        if(pending.length === 0) {
            reqList.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:20px;">No new follow requests.</p>';
        } else {
            reqList.innerHTML = '';
            for (const id of pending) {
                const u = await DB.getUser(id);
                if(u) {
                    reqList.innerHTML += `
                    <div class="notification" style="align-items:center;">
                        <img src="${u.profile_pic || 'https://ui-avatars.com/api/?name='+u.fullname}" onclick="window.location.href='profile.html?id=${u.id}'" style="cursor:pointer;">
                        <div style="flex:1;">
                            <strong onclick="window.location.href='profile.html?id=${u.id}'" style="cursor:pointer; color:var(--text-main);">${u.fullname}</strong>
                            <div style="font-size:0.8rem; color:var(--text-secondary);">wants to follow you</div>
                        </div>
                        <div class="req-actions">
                            <button class="btn-req-accept" onclick="handleReq('accept', '${u.id}')">Accept</button>
                            <button class="btn-req-reject" onclick="handleReq('reject', '${u.id}')"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    </div>`;
                }
            }
        }

        tabNotif.addEventListener('click', () => {
            tabNotif.classList.add('active'); tabReq.classList.remove('active');
            viewNotif.style.display = 'block'; viewReq.style.display = 'none';
        });
        tabReq.addEventListener('click', () => {
            tabReq.classList.add('active'); tabNotif.classList.remove('active');
            viewReq.style.display = 'block'; viewNotif.style.display = 'none';
        });

        // Notifications logic
        let lastNotifCount = -1;
        async function renderNotifs() {
            const notifs = await DB.getNotifications(currentUser.id);
            if (notifs.length === lastNotifCount) return;
            lastNotifCount = notifs.length;
            
            if (notifs.length === 0) {
                viewNotif.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:20px;">No new notifications.</p>';
            } else {
                viewNotif.innerHTML = '';
                notifs.forEach(n => {
                    let text = "interacted with you";
                    if (n.type === "like") text = "liked your video.";
                    if (n.type === "comment") text = "commented on your video.";
                    if (n.type === "follow") text = "started following you.";
                    
                    const senderName = n.sender ? n.sender.fullname : "Someone";
                    const senderPic = n.sender ? n.sender.profile_pic : "https://ui-avatars.com/api/?name=User";
                    
                    const timeStr = new Date(n.created_at).toLocaleString();
                    
                    viewNotif.innerHTML += `
                    <div class="notification">
                        <img src="${senderPic}" onclick="window.location.href='profile.html?id=${n.sender_id}'" style="cursor:pointer;">
                        <p><strong onclick="window.location.href='profile.html?id=${n.sender_id}'" style="cursor:pointer; color:white;">${senderName}</strong> ${text}</p>
                        <span>${timeStr}</span>
                    </div>`;
                });
            }
        }
        
        renderNotifs();
        setInterval(renderNotifs, 3000);
        
        if (DB.subscribeToNotifications) {
            DB.subscribeToNotifications(currentUser.id, () => {
                renderNotifs();
            });
        }
    }

    // Chat Logic
    if(window.location.pathname.includes('chat.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        let activeUserId = urlParams.get('user');

        const friendsList = document.getElementById('chat-friends-list');
        // Users we are following OR are following us
        const friendIds = [...new Set([...(currentUser.following||[]), ...(currentUser.followers||[])])]; const chatUsers = friendIds.length > 0 ? (await DB.getUsersByIds(friendIds)).filter(u => u.id !== currentUser.id) : [];
        

        if(chatUsers.length === 0) {
            friendsList.innerHTML = '<p style="padding:20px; color:var(--text-secondary);">Follow someone to start chatting!</p>';
        } else {
            chatUsers.forEach(u => {
                const div = document.createElement('div');
                div.className = `chat-user ${activeUserId === u.id ? 'active' : ''}`;
                div.onclick = () => window.location.href = `chat.html?user=${u.id}`;
                div.innerHTML = `
                    <img src="${u.profile_pic || 'https://ui-avatars.com/api/?name='+u.fullname}">
                    <div class="chat-user-info">
                        <h4>${u.fullname}</h4>
                        <p>Tap to chat</p>
                    </div>
                `;
                friendsList.appendChild(div);
            });
        }

        if(activeUserId) {
            const chatLayout = document.querySelector('.chat-layout');
            if (chatLayout) chatLayout.classList.add('chat-active-mobile');
            
            document.getElementById('no-chat-selected').style.display = 'none';
            document.getElementById('chat-window').style.display = 'flex';
            
            const activeUser = await DB.getUser(activeUserId);
            document.getElementById('chat-active-img').src = activeUser.profilePic;
            document.getElementById('chat-active-name').textContent = activeUser.fullname;

            await renderMessages(activeUserId);

            const sendBtn = document.getElementById('send-msg-btn');
            const input = document.getElementById('chat-input-msg');

            const sendMsg = async () => {
                const text = input.value.trim();
                if(text) {
                    input.value = '';
                    await DB.sendMessage(currentUser.id, activeUserId, text);
                    await renderMessages(activeUserId);
                }
            };

            sendBtn.onclick = sendMsg;
            input.onkeypress = (e) => { if(e.key === 'Enter') sendMsg(); };

            // Realtime listener
            if (DB.subscribeToMessages) {
                DB.subscribeToMessages((newMessage) => {
                    if ((newMessage.sender_id === activeUserId && newMessage.receiver_id === currentUser.id) || 
                        (newMessage.sender_id === currentUser.id && newMessage.receiver_id === activeUserId)) {
                        renderMessages(activeUserId);
                    }
                });
            }
            
            // Fallback polling (every 3 seconds) in case realtime is not enabled on DB
            setInterval(() => {
                renderMessages(activeUserId);
            }, 3000);
        }

        let lastMessageCount = -1;
        async function renderMessages(otherId) {
            const container = document.getElementById('chat-messages');
            const conversation = await DB.getConversation(currentUser.id, otherId);
            
            if (conversation.length === lastMessageCount) return; // No new messages
            lastMessageCount = conversation.length;
            
            container.innerHTML = '';
            if(conversation.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:auto; margin-bottom:auto;">Say hi to ' + (await DB.getUser(otherId)).fullname + '!</p>';
            }

            conversation.forEach(m => {
                const isMine = m.senderId === currentUser.id;
                const timeStr = new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                container.innerHTML += `<div class="message ${isMine ? 'sent' : 'received'}">${m.text} <span class="msg-time">${timeStr}</span></div>`;
            });
            container.scrollTop = container.scrollHeight;
        }

            conversation.forEach(m => {
                const isMine = m.senderId === currentUser.id;
                const timeStr = new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                container.innerHTML += `<div class="message ${isMine ? 'sent' : 'received'}">${m.text} <span class="msg-time">${timeStr}</span></div>`;
            });
            container.scrollTop = container.scrollHeight;
        }

            conversation.forEach(m => {
                const isMine = m.senderId === currentUser.id;
                const timeStr = new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                container.innerHTML += `<div class="message ${isMine ? 'sent' : 'received'}">${m.text} <span class="msg-time">${timeStr}</span></div>`;
            });
            container.scrollTop = container.scrollHeight;
        }
    }

    // Upload Video Logic
    const uploadForm = document.getElementById('upload-form');
    if(uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('video-file');
            const caption = document.getElementById('video-caption').value.trim();
            const btn = document.getElementById('upload-btn');
            
            if(fileInput.files.length > 0) {
                const file = fileInput.files[0];
                if(file.size > 2 * 1024 * 1024) {
                    alert('File is too large! Please select a video under 2MB.');
                    return;
                }

                btn.textContent = 'Uploading...';
                btn.disabled = true;

                const reader = new FileReader();
                reader.onload = async function(evt) {
                    try {
                        const mentionedId = document.getElementById('mentioned-user-id').value;
                        await DB.createVideo(currentUser.id, evt.target.result, caption, mentionedId || null);
                        window.location.href = 'profile.html';
                    } catch (e) {
                        alert('Upload failed: ' + e.message);
                        btn.textContent = 'Post';
                        btn.disabled = false;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Mention Input Logic
    const mentionInput = document.getElementById('mention-input');
    const mentionResults = document.getElementById('mention-results');
    const mentionedUserIdInput = document.getElementById('mentioned-user-id');
    const selectedMention = document.getElementById('selected-mention');

    if (mentionInput) {
        mentionInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim().replace('@', '');
            if (query.length < 2) {
                mentionResults.style.display = 'none';
                return;
            }
            const users = await DB.searchUsers(query);
            if (users.length > 0) {
                mentionResults.style.display = 'block';
                mentionResults.innerHTML = users.map(u => `
                    <div class="search-user-item" style="display:flex; align-items:center; padding:10px; cursor:pointer; border-bottom:1px solid var(--border);" data-id="${u.id}" data-name="${u.fullname}">
                        <img src="$${u.profile_pic || 'default.png'}" style="width:30px; height:30px; border-radius:50%; margin-right:10px; object-fit:cover;">
                        <span>${u.fullname}</span>
                    </div>
                `).join('');

                mentionResults.querySelectorAll('.search-user-item').forEach(item => {
                    item.addEventListener('click', () => {
                        mentionedUserIdInput.value = item.getAttribute('data-id');
                        selectedMention.textContent = `Mentioned: @${item.getAttribute('data-name').replace(/\s+/g, '').toLowerCase()}`;
                        selectedMention.style.display = 'block';
                        mentionInput.value = '';
                        mentionResults.style.display = 'none';
                    });
                });
            } else {
                mentionResults.style.display = 'block';
                mentionResults.innerHTML = '<div style="padding:10px;">No users found.</div>';
            }
        });
    }

    // Search Nav Logic
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const mobileSearchResults = document.getElementById('mobile-search-results');

    async function performSearch(query, resultsContainer, isMobile=false) {
        if (query.length < 2) {
            if(isMobile) {
                resultsContainer.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:20px;">Type a username to search</p>';
            } else {
                resultsContainer.style.display = 'none';
            }
            return;
        }
        
        const users = await DB.searchUsers(query);
        if(!isMobile) resultsContainer.style.display = 'block';
        
        if (users.length > 0) {
            resultsContainer.innerHTML = users.map(u => `
                <div class="search-user-item" onclick="window.location.href='profile.html?id=${u.id}'" style="display:flex; align-items:center; padding:10px; cursor:pointer; border-bottom:1px solid var(--border);">
                    <img src="$${u.profile_pic || 'https://ui-avatars.com/api/?name=User'}" style="width:40px; height:40px; border-radius:50%; margin-right:10px; object-fit:cover;">
                    <div style="flex:1;">
                        <div style="font-weight:600;">${u.fullname}</div>
                        <div style="font-size:0.8rem; color:var(--text-secondary);">@${u.fullname.replace(/\s+/g, '').toLowerCase()}</div>
                    </div>
                </div>
            `).join('');
        } else {
            resultsContainer.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-secondary);">No users found.</div>';
        }
    }

    if (searchInput && searchResults) {
        searchInput.addEventListener('input', (e) => performSearch(e.target.value.trim(), searchResults, false));
        document.addEventListener('click', (e) => {
            if(!e.target.closest('.search-box')) {
                searchResults.style.display = 'none';
            }
        });
        searchInput.addEventListener('focus', (e) => {
            if(e.target.value.trim().length >= 2) searchResults.style.display = 'block';
        });
    }

    if (mobileSearchInput && mobileSearchResults) {
        mobileSearchInput.addEventListener('input', (e) => performSearch(e.target.value.trim(), mobileSearchResults, true));
    }
    
    // Notifications Logic
    const notifBtn = document.getElementById('notification-btn');
    const notifDropdown = document.getElementById('notification-dropdown');
    const notifBadge = document.getElementById('notif-badge');
    const notifList = document.getElementById('notif-list');

    if (notifBtn) {
        // Fetch Notifications
        const notifications = await DB.getNotifications(currentUser.id);
        const unreadCount = notifications.filter(n => !n.is_read).length;
        if (unreadCount > 0) {
            notifBadge.style.display = 'block';
            notifBadge.textContent = unreadCount;
        }

        notifBtn.addEventListener('click', async () => {
            notifDropdown.style.display = notifDropdown.style.display === 'none' ? 'block' : 'none';
            if (notifDropdown.style.display === 'block') {
                if (notifications.length === 0) {
                    notifList.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">No notifications</p>';
                } else {
                    notifList.innerHTML = notifications.map(n => {
                        let text = '';
                        if (n.type === 'mention') text = 'mentioned you in a video.';
                        else if (n.type === 'like') text = 'liked your video.';
                        else if (n.type === 'comment') text = 'commented on your video.';
                        else if (n.type === 'follow') text = 'started following you.';
                        return `
                        <div style="display:flex; align-items:center; padding:10px; border-bottom:1px solid var(--border); ${n.is_read ? '' : 'background: rgba(255,0,80,0.1);'}">
                            <img src="${n.sender.profile_pic}" style="width:30px; height:30px; border-radius:50%; margin-right:10px; object-fit:cover;">
                            <span style="font-size:0.9rem;"><strong>${n.sender.fullname}</strong> ${text}</span>
                        </div>
                        `;
                    }).join('');
                }
            }
        }, 300); });
        
        document.addEventListener('click', (e) => {
            if(!e.target.closest('#notification-btn') && !e.target.closest('#notification-dropdown')) {
                notifDropdown.style.display = 'none';
            }
        });
    }

});

// Global async functions for inline HTML calls
window.toggleLike = async function(videoId, btnElement) {
    const currentUser = await DB.getCurrentUser();
    const isLiked = btnElement.classList.contains('liked');
    
    await DB.toggleLike(videoId, currentUser.id, isLiked);
    
    if(isLiked) {
        btnElement.classList.remove('liked');
        btnElement.querySelector('.likes-count').textContent = parseInt(btnElement.querySelector('.likes-count').textContent) - 1;
    } else {
        btnElement.classList.add('liked');
        btnElement.querySelector('.likes-count').textContent = parseInt(btnElement.querySelector('.likes-count').textContent) + 1;
    }
};

window.followUserFromFeed = async function(userId) {
    const currentUser = await DB.getCurrentUser();
    await DB.requestFollow(currentUser.id, userId);
    window.location.reload(); 
};

window.handleReq = async function(action, userId) {
    const currentUser = await DB.getCurrentUser();
    if(action === 'accept') {
        await DB.acceptFollow(currentUser.id, userId);
    } else {
        await DB.rejectFollow(currentUser.id, userId);
    }
    window.location.reload();
};

window.openComments = async function(videoId) {
    const modal = document.getElementById('comments-modal');
    const list = document.getElementById('comments-list');
    const input = document.getElementById('comment-input');
    const sendBtn = document.getElementById('send-comment-btn');
    
    const allVideos = await DB.getVideos();
    const vid = allVideos.find(v => v.id === videoId);
    
    list.innerHTML = '';
    if(vid.comments.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:20px;">No comments yet. Be the first to comment!</p>';
    } else {
        for (const c of vid.comments) {
            const u = await DB.getUser(c.userId);
            if(u) {
                list.innerHTML += `
                <div class="comment-item">
                    <img src="${u.profile_pic || 'https://ui-avatars.com/api/?name='+u.fullname}">
                    <div class="ci-content">
                        <h4>${u.fullname}</h4>
                        <p>${c.text}</p>
                    </div>
                </div>`;
            }
        }
    }
    
    modal.classList.add('active');
    
    sendBtn.onclick = async () => {
        const txt = input.value.trim();
        if(txt) {
            const currentUser = await DB.getCurrentUser();
            await DB.addComment(videoId, currentUser.id, txt);
            input.value = '';
            
            // Update UI comment count
            const vidContainer = document.querySelector(`.video-container[data-id="${videoId}"]`);
            if(vidContainer) {
                const countSpan = vidContainer.querySelector('.comment-btn .comments-count');
                if(countSpan) countSpan.textContent = parseInt(countSpan.textContent) + 1;
            }
            
            await window.openComments(videoId); // re-render
        }
    };
};

window.closeComments = function() {
    document.getElementById('comments-modal').classList.remove('active');
};

window.deleteVideo = async (id) => {
    if(confirm('Are you sure you want to delete this video?')) {
        await DB.deleteVideo(id);
        window.location.reload();
    }
};
