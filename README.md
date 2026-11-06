# gym-guy-front

React 19 + Vite + TypeScript app for gym-guy (Persian, RTL).
The API lives in [gym-guy-back](https://github.com/alihanii/gym-guy-back).

## Run

The easy way is the backend repo's `start.sh`, which runs both and keeps them updated:

```bash
mkdir -p ~/Desktop/gym-guy && cd ~/Desktop/gym-guy
git clone https://github.com/alihanii/gym-guy-back.git
git clone https://github.com/alihanii/gym-guy-front.git
./gym-guy-back/start.sh
```

Frontend alone (expects the API on http://127.0.0.1:8000):

```bash
npm install
npm run dev -- --port 5173      # open http://localhost:5173
```

`/api` and `/media` are proxied to the backend by Vite. Point them elsewhere with
`VITE_API_PROXY=http://host:8000 npm run dev`.

Design notes: `DESIGN.md`. Design skills used while building: `.claude/skills`.
