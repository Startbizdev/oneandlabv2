#!/bin/bash
cd /Users/alessandro/Desktop/onev2
export $(cat .env | xargs)
cd backend
/opt/homebrew/opt/php@8.2/bin/php -S localhost:8888
