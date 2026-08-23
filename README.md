#

## Local Build and run

npx nx serve zitro-customer

## Before committ

npm run finalize:lint-only # run lint on affected projects (what pre-commit uses)
npx nx affected:lint --fix # same thing directly
npx lint-staged # test what pre-commit will run on your staged files

## Deployment for firebase:

cd /Users/krishna/Documents/GitHub/zitro-root/apps;
npx nx build zitro-customer --configuration=production;
firebase use zitro-customer;
firebase deploy --only hosting;

##

to kill all processes running in background:
lsof -tiTCP:4201 -sTCP:LISTEN | xargs kill -9 2>/dev/null; echo done

#
