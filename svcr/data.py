"""Cached performance map (built once, shared by tests, experiments and the browser)."""
import os, numpy as np
from .cycle import Cycle, build_map, PerfMap
_F = os.path.join(os.path.dirname(__file__), "..", "results", "perfmap.npy")
def load(cy=Cycle(), rebuild=False):
    if rebuild or not os.path.exists(_F):
        os.makedirs(os.path.dirname(_F), exist_ok=True); np.save(_F, build_map(cy))
    tab = np.load(_F); return tab, PerfMap(tab)
