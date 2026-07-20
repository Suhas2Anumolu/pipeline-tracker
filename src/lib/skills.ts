// Keyword-based skill taxonomy. Each canonical skill maps to the aliases we
// should also recognize in free text (case-insensitive, word-boundary
// matched). This is intentionally a simple, deterministic V1 — no external
// API calls, nothing to configure, works offline. See src/lib/match.ts for
// the upgrade path to embeddings-based semantic matching once you're ready
// to wire up an API key.

export const SKILL_TAXONOMY: Record<string, string[]> = {
  Python: ["python", "py"],
  Java: ["java"],
  "C++": ["c\\+\\+", "cpp"],
  "C#": ["c#", "csharp"],
  JavaScript: ["javascript", "\\bjs\\b"],
  TypeScript: ["typescript", "\\bts\\b"],
  Go: ["\\bgolang\\b", "\\bgo\\b"],
  Rust: ["\\brust\\b"],
  SQL: ["\\bsql\\b", "postgresql", "postgres", "mysql"],
  React: ["react", "react\\.js", "reactjs"],
  "Node.js": ["node\\.js", "nodejs", "\\bnode\\b"],
  "Next.js": ["next\\.js", "nextjs"],
  Django: ["django"],
  Flask: ["flask"],
  "Spring Boot": ["spring boot", "\\bspring\\b"],
  Docker: ["docker"],
  Kubernetes: ["kubernetes", "\\bk8s\\b"],
  AWS: ["\\baws\\b", "amazon web services"],
  GCP: ["\\bgcp\\b", "google cloud"],
  Azure: ["\\bazure\\b"],
  Terraform: ["terraform"],
  "CI/CD": ["ci/cd", "continuous integration", "continuous deployment"],
  Git: ["\\bgit\\b", "github", "gitlab"],
  Linux: ["\\blinux\\b", "unix"],
  "Distributed Systems": ["distributed systems"],
  Microservices: ["microservices", "microservice architecture"],
  "REST APIs": ["rest api", "restful", "\\brest\\b"],
  GraphQL: ["graphql"],
  gRPC: ["grpc"],
  Kafka: ["kafka"],
  Redis: ["redis"],
  "Machine Learning": ["machine learning", "\\bml\\b"],
  "Deep Learning": ["deep learning", "neural network"],
  PyTorch: ["pytorch"],
  TensorFlow: ["tensorflow"],
  "Data Structures & Algorithms": ["data structures", "algorithms", "\\bdsa\\b"],
  "System Design": ["system design"],
  MongoDB: ["mongodb", "\\bmongo\\b"],
  GraphDB: ["neo4j", "graph database"],
  Kotlin: ["kotlin"],
  Swift: ["\\bswift\\b"],
  "Objective-C": ["objective-c"],
  Ruby: ["\\bruby\\b"],
  "Ruby on Rails": ["rails", "ruby on rails"],
  PHP: ["\\bphp\\b"],
  Scala: ["\\bscala\\b"],
  Bash: ["\\bbash\\b", "shell script"],
  Agile: ["\\bagile\\b", "\\bscrum\\b"],
  Testing: ["unit test", "integration test", "\\bjest\\b", "\\bpytest\\b"],
};

export function extractSkills(text: string): Set<string> {
  const found = new Set<string>();
  const lower = text.toLowerCase();
  for (const [canonical, aliases] of Object.entries(SKILL_TAXONOMY)) {
    for (const alias of aliases) {
      const re = new RegExp(alias, "i");
      if (re.test(lower)) {
        found.add(canonical);
        break;
      }
    }
  }
  return found;
}
