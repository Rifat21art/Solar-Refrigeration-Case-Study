"""Write web/model-data.json: performance map, property dome, plant defaults, reference day, experiment summary."""
import sys, os, json; sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import numpy as np, dataclasses
from svcr import data
from svcr.cycle import Cycle, GRID, R_COLS, dome, _A, _B, _C, _hf, _hg
from svcr.plant import Plant
tab, _ = data.load(); root = os.path.join(os.path.dirname(__file__), "..")
ref = json.load(open(os.path.join(root, "results", "reference_day.json")))
exp = json.load(open(os.path.join(root, "results", "experiments.json")))
D = dict(map=dict(axes={k: v.tolist() for k, v in GRID.items()}, cols=R_COLS, data=np.round(tab, 4).ravel().tolist()),
         dome=dome(), antoine=[float(_A), float(_B), float(_C)], fluid=dict(antoine=[float(_A), float(_B), float(_C)], hf=_hf.tolist(), hg=_hg.tolist()), plant=dataclasses.asdict(Plant()), cycle=dataclasses.asdict(Cycle()),
         day=ref["day"], reference={p: {"metrics": ref[p]["metrics"]} for p in ("fixed", "solar", "storage")},
         experiments=dict(E1=exp["E1"], storage_size=exp["E2"]["storage_size"]))
json.dump(D, open(os.path.join(root, "web", "model-data.json"), "w"), separators=(",", ":"))
print("web/model-data.json", os.path.getsize(os.path.join(root, "web", "model-data.json")) // 1024, "kB")
