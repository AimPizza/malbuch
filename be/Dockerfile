FROM rust:1.86

RUN USER=root cargo new --bin malbuch-backend
WORKDIR /malbuch-backend

COPY ./Cargo.toml ./Cargo.toml
COPY ./Cargo.lock ./Cargo.lock

RUN cargo build --release
RUN rm src/*.rs

COPY ./src ./src

RUN rm ./target/release/deps/malbuch*
RUN cargo install --path .

EXPOSE 8090

CMD ["malbuch-backend"]
