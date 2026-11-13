# Robot Wiki

A cited encyclopedia of modern robot learning, written for machine-learning
engineers moving into robotics.

<https://robot-wiki.com>

## What is inside

- **57 articles** across seven domains: manipulation and learned policies, RL
  and sim-to-real, world models, data and hardware, classical foundations,
  frontier problems and adjacent fields.
- **About a hundred interactive figures**, twelve 3D explainers on
  [How robots work](https://robot-wiki.com/how-robots-work/) and a
  [playground](https://robot-wiki.com/playground/) for the SO-101 arm.
- **1,800 sources** in one registry. Every number points to a paper, an
  official document or a dataset card. Unknown values say "not disclosed".
- **A market map** of 119 robotics companies, each with a source link, and a
  glossary of 162 cited terms.

## Run it

Node.js 22 or later.

```sh
npm install
npm run dev      # http://localhost:3200
npm run build    # static site in out/
```

## Layout

```
content/     the articles, in MDX, one folder per domain
data/        sources, glossary, companies, datasets and other registries
components/  pages, interactive figures, explainers, 3D playground
app/         routes
lib/         content pipeline, search, solvers and figure models
scripts/     build steps and checks
```

## Contributing

Corrections with a primary source are the most useful contribution. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## License

Code is MIT ([LICENSE](LICENSE)). Articles, glossary definitions and figures
are CC BY 4.0 ([LICENSE-CONTENT](LICENSE-CONTENT)). The SO-101 arm model is
from [TheRobotStudio/SO-ARM100](https://github.com/TheRobotStudio/SO-ARM100),
Apache 2.0.
