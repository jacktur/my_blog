const fs = require('node:fs');
const path = require('node:path');
const LogisticRegression = require('ml-logistic-regression');
const { Matrix } = require('ml-matrix');
const { fitVocabulary, vectorize, ngrams, signals } = require('./features');
const { analyzeArticle } = require('./engine');

function validateDataset(data) {
  const seen = new Map();
  for (const row of data) {
    if (!['train', 'validation', 'test'].includes(row.split) || ![0, 1].includes(row.label) || typeof row.text !== 'string' || !row.text.trim()) throw new Error('Each sample needs text, label 0/1 and split train/validation/test');
    const canonical = row.text.normalize('NFKC').replace(/[\s\p{P}\u200b-\u200f]/gu, '').toLowerCase();
    if (seen.has(canonical)) throw new Error(`Duplicate sample: ${row.id}`);
    seen.set(canonical, row.split);
  }
  for (const split of ['train', 'validation', 'test']) if (new Set(data.filter((row) => row.split === split).map((row) => row.label)).size !== 2) throw new Error(`${split} must contain both labels`);
}

function metrics(rows, predict) {
  let tp = 0, fp = 0, fn = 0, tn = 0, reviews = 0, leaked = 0;
  for (const row of rows) {
    const result = predict(row.text);
    const positive = result !== 'published';
    if (positive) reviews++;
    if (positive && row.label) tp++;
    else if (positive) fp++;
    else if (row.label) { fn++; leaked++; }
    else tn++;
  }
  const precision = tp / (tp + fp || 1), recall = tp / (tp + fn || 1);
  return { tp, fp, fn, tn, precision, recall, f1: 2 * precision * recall / (precision + recall || 1),
    reviewRatio: reviews / rows.length, violationPassRatio: leaked / (tp + fn || 1) };
}

function train(data) {
  validateDataset(data);
  const training = data.filter((row) => row.split === 'train');
  const model = { version: `lr-char23-${new Date().toISOString()}`, ...fitVocabulary(training.map((row) => row.text)), thresholds: { review: 0.4, hold: 0.8 }, weights: [] };
  const classifier = new LogisticRegression({ numSteps: 1200, learningRate: 0.03 / training.length });
  classifier.train(new Matrix(training.map((row) => vectorize(row.text, model).vector)), Matrix.columnVector(training.map((row) => row.label)));
  // mljs class 0's one-vs-rest target is 1 for the violation class.
  model.weights = classifier.toJSON().classifiers[0].weights.to1DArray();
  const validation = data.filter((row) => row.split === 'validation');
  let best = -Infinity;
  for (let threshold = 0.2; threshold <= 0.65; threshold += 0.025) {
    model.thresholds.review = Number(threshold.toFixed(3));
    const result = metrics(validation, (text) => analyzeArticle({ content: text }, model).decision);
    const objective = result.f1 - result.violationPassRatio * 0.5 - result.reviewRatio * 0.05;
    if (objective > best) { best = objective; model.selectedThreshold = model.thresholds.review; }
  }
  model.thresholds.review = model.selectedThreshold;
  delete model.selectedThreshold;
  model.training = { source: 'educational fixtures or explicitly curated labels', count: training.length,
    calibration: 'not calibrated', holdThreshold: 'manual initial setting', limits: 'small dataset; scores are not validated violation probabilities' };
  return model;
}

function bayesBaseline(training) {
  const classes = [new Map(), new Map()], totals = [0, 0], docs = [0, 0], vocabulary = new Set();
  for (const row of training) {
    docs[row.label]++;
    for (const [term, count] of ngrams(row.text)) {
      vocabulary.add(term); totals[row.label] += count;
      classes[row.label].set(term, (classes[row.label].get(term) || 0) + count);
    }
  }
  return (text) => {
    const scores = [0, 1].map((label) => {
      let sum = Math.log(docs[label] / training.length);
      for (const [term, count] of ngrams(text)) if (vocabulary.has(term)) sum += count * Math.log(((classes[label].get(term) || 0) + 1) / (totals[label] + vocabulary.size));
      return sum;
    });
    return scores[1] > scores[0] ? 'pending' : 'published';
  };
}

if (require.main === module) {
  const data = process.argv[2] ? JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), 'utf8')) : require('./dataset');
  const model = train(data);
  const test = data.filter((row) => row.split === 'test');
  const report = { note: 'Small educational test set; no production accuracy claim.', modelVersion: model.version,
    thresholds: model.thresholds,
    keyword: metrics(test, (text) => signals(text).promise ? 'pending' : 'published'),
    naiveBayes: metrics(test, bayesBaseline(data.filter((row) => row.split === 'train'))),
    logisticWindows: metrics(test, (text) => analyzeArticle({ content: text }, model).decision) };
  fs.writeFileSync(path.join(__dirname, 'model.json'), JSON.stringify(model, null, 2) + '\n');
  fs.writeFileSync(path.join(__dirname, 'evaluation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}

module.exports = { train, metrics, validateDataset, bayesBaseline };
