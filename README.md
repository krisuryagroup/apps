#

Deployment for firebase:
cd /Users/krishna/Documents/GitHub/zitro-root/apps
npx nx build zitro-customer --configuration=production
firebase use zitro-customer
firebase deploy --only hosting

#
