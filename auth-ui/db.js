const SUPABASE_URL = 'https://syysdzxhxpbgnmzgkkfp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eXNkenhoeHBiZ25temdra2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNDYzODMsImV4cCI6MjEwNjgyMjM4M30.1uScIQz0Mai89sB74sBZOzCqGYQmal9oMxA0WmOSszM';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DB = {
    // Auth
    register: async (email, password, fullname, profilePicBase64) => {
        const { data, error } = await supabaseClient.functions.invoke('register_bypass', {
            body: { email, password, fullname, profilePicBase64 }
        });
        
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);

        return data.data;
    },
    login: async (email, password) => {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },
    logout: async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    },
    getCurrentUser: async () => {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if(!user) return null;
        
        const { data: u } = await supabaseClient.from('users').select('*').eq('id', user.id).single();
        if(!u) return null;
        
        // Also fetch followers, following, pending
        const { data: follows } = await supabaseClient.from('follows').select('*');
        const following = follows.filter(f => f.follower_id === user.id && f.status === 'accepted').map(f => f.target_id);
        const followers = follows.filter(f => f.target_id === user.id && f.status === 'accepted').map(f => f.follower_id);
        const pendingFollowers = follows.filter(f => f.target_id === user.id && f.status === 'pending').map(f => f.follower_id);
        
        return {
            id: u.id,
            email: user.email,
            fullname: u.fullname,
            profilePic: u.profile_pic || 'https://ui-avatars.com/api/?name='+u.fullname,
            bio: u.bio || '',
            following,
            followers,
            pendingFollowers
        };
    },
    
    // Users
    getUsers: async () => {
        const { data } = await supabaseClient.from('users').select('*');
        const { data: follows } = await supabaseClient.from('follows').select('*');
        
        return data.map(u => {
            const following = follows.filter(f => f.follower_id === u.id && f.status === 'accepted').map(f => f.target_id);
            const followers = follows.filter(f => f.target_id === u.id && f.status === 'accepted').map(f => f.follower_id);
            const pendingFollowers = follows.filter(f => f.target_id === u.id && f.status === 'pending').map(f => f.follower_id);
            return {
                id: u.id,
                fullname: u.fullname,
                profilePic: u.profile_pic || 'https://ui-avatars.com/api/?name='+u.fullname,
                bio: u.bio || '',
                following,
                followers,
                pendingFollowers
            };
        });
    },
    getUser: async (id) => {
        const users = await DB.getUsers();
        return users.find(u => u.id === id);
    },
    updateUser: async (id, updates) => {
        const { error } = await supabaseClient.from('users').update(updates).eq('id', id);
        if(error) throw error;
    },

    // Videos
    getVideos: async () => {
        const { data: vids } = await supabaseClient.from('videos').select('*').order('created_at', { ascending: true });
        if(!vids) return [];
        
        const { data: likes } = await supabaseClient.from('likes').select('*');
        const { data: comments } = await supabaseClient.from('comments').select('*').order('created_at', { ascending: true });
        
        return vids.map(v => {
            return {
                id: v.id,
                userId: v.user_id,
                videoUrl: v.video_url,
                caption: v.caption,
                timestamp: v.created_at,
                likes: likes.filter(l => l.video_id === v.id).map(l => l.user_id),
                comments: comments.filter(c => c.video_id === v.id).map(c => ({
                    id: c.id,
                    userId: c.user_id,
                    text: c.text
                }))
            };
        });
    },
    deleteVideo: async (videoId) => {
        const { error } = await supabaseClient.from('videos').delete().eq('id', videoId);
        if(error) console.error(error);
    },
    createVideo: async (userId, url, caption, mentionedUserId = null) => {
        const { data, error } = await supabaseClient.from('videos').insert({ 
            user_id: userId, 
            video_url: url, 
            caption: caption,
            mentioned_user_id: mentionedUserId
        }).select().single();
        if(error) throw error;

        if (mentionedUserId) {
            await DB.addNotification(mentionedUserId, userId, 'mention', data.id);
        }
    },

    // Interactions
    toggleLike: async (videoId, userId, isLiked) => {
        if(isLiked) {
            await supabaseClient.from('likes').delete().eq('video_id', videoId).eq('user_id', userId);
        } else {
            await supabaseClient.from('likes').insert({ video_id: videoId, user_id: userId });
            const { data } = await supabaseClient.from('videos').select('user_id').eq('id', videoId).single();
            if (data && data.user_id !== userId) {
                await DB.addNotification(data.user_id, userId, 'like', videoId);
            }
        }
    },
    addComment: async (videoId, userId, text) => {
        const { error } = await supabaseClient.from('comments').insert({ video_id: videoId, user_id: userId, text: text });
        if(error) throw error;
        const { data } = await supabaseClient.from('videos').select('user_id').eq('id', videoId).single();
        if (data && data.user_id !== userId) {
            await DB.addNotification(data.user_id, userId, 'comment', videoId);
        }
    },
    
    // Follows
    requestFollow: async (followerId, targetId) => {
        await supabaseClient.from('follows').insert({ follower_id: followerId, target_id: targetId, status: 'pending' });
        await DB.addNotification(targetId, followerId, 'follow');
    },
    acceptFollow: async (targetId, followerId) => {
        await supabaseClient.from('follows').update({ status: 'accepted' }).eq('follower_id', followerId).eq('target_id', targetId);
    },
    rejectFollow: async (targetId, followerId) => {
        await supabaseClient.from('follows').delete().eq('follower_id', followerId).eq('target_id', targetId);
    },
    unfollow: async (followerId, targetId) => {
        await supabaseClient.from('follows').delete().eq('follower_id', followerId).eq('target_id', targetId);
    },

    // Messages
    getMessages: async () => {
        const { data } = await supabaseClient.from('messages').select('*').order('created_at', { ascending: true });
        if(!data) return [];
        return data.map(m => ({
            id: m.id,
            senderId: m.sender_id,
            receiverId: m.receiver_id,
            text: m.text,
            timestamp: m.created_at
        }));
    },
    sendMessage: async (senderId, receiverId, text) => {
        await supabaseClient.from('messages').insert({ sender_id: senderId, receiver_id: receiverId, text: text });
    },

    // Search
    searchUsers: async (query) => {
        const { data, error } = await supabaseClient.from('users').select('*').ilike('fullname', `%${query}%`).limit(10);
        if (error) throw error;
        return data || [];
    },

    // Notifications
    addNotification: async (userId, senderId, type, videoId = null) => {
        const { error } = await supabaseClient.from('notifications').insert({
            user_id: userId,
            sender_id: senderId,
            type: type,
            video_id: videoId
        });
        if (error) console.error("Notification Error:", error);
    },
    getNotifications: async (userId) => {
        const { data, error } = await supabaseClient.from('notifications')
            .select('*, sender:sender_id(fullname, profile_pic)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }
};
