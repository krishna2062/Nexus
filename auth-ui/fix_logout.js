const fs = require('fs');
const files = ['chat.html','dashboard.html','friends.html','inbox.html','profile.html','reels.html','upload.html'];

files.forEach(f => {
  if (fs.existsSync(f)) {
      let content = fs.readFileSync(f, 'utf-8');
      
      content = content.replace(/onclick="window\.supabaseClient\.auth\.signOut\(\)\.then\(\(\) => \{window\.location\.href='index\.html'\}\)"/g, 'onclick="DB.logout()"');
      
      fs.writeFileSync(f, content);
  }
});
console.log('Fixed logout button action');
