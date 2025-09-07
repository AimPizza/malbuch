TAG="dev"

docker build -t malbuch-fe:$TAG ./fe && 
docker build -t malbuch-be:$TAG ./be
