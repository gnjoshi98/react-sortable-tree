'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var jsxRuntime = require('react/jsx-runtime');
var React = require('react');
var withScrolling = require('@nosferatu500/react-dnd-scrollzone');
var isEqual = require('lodash.isequal');
var reactDnd = require('react-dnd');
var reactDndHtml5Backend = require('react-dnd-html5-backend');
var reactVirtuoso = require('react-virtuoso');

const defaultGetNodeKey = ({
  treeIndex
}) => treeIndex;
const getReactElementText = parent => {
  if (typeof parent === 'string') {
    return parent;
  }
  if (parent === undefined || typeof parent !== 'object' || !parent.props || !parent.props.children || typeof parent.props.children !== 'string' && typeof parent.props.children !== 'object') {
    return '';
  }
  if (typeof parent.props.children === 'string') {
    return parent.props.children;
  }
  return parent.props.children.map(child => getReactElementText(child)).join('');
};
const stringSearch = (key, searchQuery, node, path, treeIndex) => {
  if (typeof node[key] === 'function') {
    return String(node[key]({
      node,
      path,
      treeIndex
    })).includes(searchQuery);
  }
  if (typeof node[key] === 'object') {
    return getReactElementText(node[key]).includes(searchQuery);
  }
  return node[key] && String(node[key]).includes(searchQuery);
};
const defaultSearchMethod = ({
  node,
  path,
  treeIndex,
  searchQuery
}) => {
  return stringSearch('title', searchQuery, node, path, treeIndex) || stringSearch('subtitle', searchQuery, node, path, treeIndex);
};

const getNodeDataAtTreeIndexOrNextIndex = ({
  targetIndex,
  node,
  currentIndex,
  getNodeKey,
  path = [],
  lowerSiblingCounts = [],
  ignoreCollapsed = true,
  isPseudoRoot = false
}) => {
  const selfPath = isPseudoRoot ? [] : [...path, getNodeKey({
    node,
    treeIndex: currentIndex
  })];
  if (currentIndex === targetIndex) {
    return {
      node,
      lowerSiblingCounts,
      path: selfPath
    };
  }
  if (!node?.children || ignoreCollapsed && node?.expanded !== true) {
    return {
      nextIndex: currentIndex + 1
    };
  }
  let childIndex = currentIndex + 1;
  const childCount = node.children.length;
  for (let i = 0; i < childCount; i += 1) {
    const result = getNodeDataAtTreeIndexOrNextIndex({
      ignoreCollapsed,
      getNodeKey,
      targetIndex,
      node: node.children[i],
      currentIndex: childIndex,
      lowerSiblingCounts: [...lowerSiblingCounts, childCount - i - 1],
      path: selfPath
    });
    if (result.node) {
      return result;
    }
    childIndex = result.nextIndex;
  }
  return {
    nextIndex: childIndex
  };
};
const getDescendantCount = ({
  node,
  ignoreCollapsed = true
}) => {
  return getNodeDataAtTreeIndexOrNextIndex({
    getNodeKey: () => {},
    ignoreCollapsed,
    node,
    currentIndex: 0,
    targetIndex: -1
  }).nextIndex - 1;
};
const walkDescendants = ({
  callback,
  getNodeKey,
  ignoreCollapsed,
  isPseudoRoot = false,
  node,
  parentNode = undefined,
  currentIndex,
  path = [],
  lowerSiblingCounts = []
}) => {
  const selfPath = isPseudoRoot ? [] : [...path, getNodeKey({
    node,
    treeIndex: currentIndex
  })];
  const selfInfo = isPseudoRoot ? undefined : {
    node,
    parentNode,
    path: selfPath,
    lowerSiblingCounts,
    treeIndex: currentIndex
  };
  if (!isPseudoRoot) {
    const callbackResult = callback(selfInfo);
    if (callbackResult === false) {
      return false;
    }
  }
  if (!node.children || node.expanded !== true && ignoreCollapsed && !isPseudoRoot) {
    return currentIndex;
  }
  let childIndex = currentIndex;
  const childCount = node.children.length;
  if (typeof node.children !== 'function') {
    for (let i = 0; i < childCount; i += 1) {
      childIndex = walkDescendants({
        callback,
        getNodeKey,
        ignoreCollapsed,
        node: node.children[i],
        parentNode: isPseudoRoot ? undefined : node,
        currentIndex: childIndex + 1,
        lowerSiblingCounts: [...lowerSiblingCounts, childCount - i - 1],
        path: selfPath
      });
      if (childIndex === false) {
        return false;
      }
    }
  }
  return childIndex;
};
const mapDescendants = ({
  callback,
  getNodeKey,
  ignoreCollapsed,
  isPseudoRoot = false,
  node,
  parentNode = undefined,
  currentIndex,
  path = [],
  lowerSiblingCounts = []
}) => {
  const nextNode = {
    ...node
  };
  const selfPath = isPseudoRoot ? [] : [...path, getNodeKey({
    node: nextNode,
    treeIndex: currentIndex
  })];
  const selfInfo = {
    node: nextNode,
    parentNode,
    path: selfPath,
    lowerSiblingCounts,
    treeIndex: currentIndex
  };
  if (!nextNode.children || nextNode.expanded !== true && ignoreCollapsed && !isPseudoRoot) {
    return {
      treeIndex: currentIndex,
      node: callback(selfInfo)
    };
  }
  let childIndex = currentIndex;
  const childCount = nextNode.children.length;
  if (typeof nextNode.children !== 'function') {
    nextNode.children = nextNode.children.map((child, i) => {
      const mapResult = mapDescendants({
        callback,
        getNodeKey,
        ignoreCollapsed,
        node: child,
        parentNode: isPseudoRoot ? undefined : nextNode,
        currentIndex: childIndex + 1,
        lowerSiblingCounts: [...lowerSiblingCounts, childCount - i - 1],
        path: selfPath
      });
      childIndex = mapResult.treeIndex;
      return mapResult.node;
    });
  }
  return {
    node: callback(selfInfo),
    treeIndex: childIndex
  };
};
const getVisibleNodeCount = ({
  treeData
}) => {
  const traverse = node => {
    if (!node.children || node.expanded !== true || typeof node.children === 'function') {
      return 1;
    }
    return 1 + node.children.reduce((total, currentNode) => total + traverse(currentNode), 0);
  };
  return treeData.reduce((total, currentNode) => total + traverse(currentNode), 0);
};
const getVisibleNodeInfoAtIndex = ({
  treeData,
  index: targetIndex,
  getNodeKey
}) => {
  if (!treeData || treeData.length === 0) {
    return undefined;
  }
  const result = getNodeDataAtTreeIndexOrNextIndex({
    targetIndex,
    getNodeKey,
    node: {
      children: treeData,
      expanded: true
    },
    currentIndex: -1,
    path: [],
    lowerSiblingCounts: [],
    isPseudoRoot: true
  });
  if (result.node) {
    return result;
  }
  return undefined;
};
const walk = ({
  treeData,
  getNodeKey,
  callback,
  ignoreCollapsed = true
}) => {
  if (!treeData || treeData.length === 0) {
    return;
  }
  walkDescendants({
    callback,
    getNodeKey,
    ignoreCollapsed,
    isPseudoRoot: true,
    node: {
      children: treeData
    },
    currentIndex: -1,
    path: [],
    lowerSiblingCounts: []
  });
};
const map = ({
  treeData,
  getNodeKey,
  callback,
  ignoreCollapsed = true
}) => {
  if (!treeData || treeData.length === 0) {
    return [];
  }
  return mapDescendants({
    callback,
    getNodeKey,
    ignoreCollapsed,
    isPseudoRoot: true,
    node: {
      children: treeData
    },
    currentIndex: -1,
    path: [],
    lowerSiblingCounts: []
  }).node.children;
};
const toggleExpandedForAll = ({
  treeData,
  expanded = true
}) => {
  return map({
    treeData,
    callback: ({
      node
    }) => ({
      ...node,
      expanded
    }),
    getNodeKey: ({
      treeIndex
    }) => treeIndex,
    ignoreCollapsed: false
  });
};
const changeNodeAtPath = ({
  treeData,
  path,
  newNode,
  getNodeKey,
  ignoreCollapsed = true
}) => {
  const RESULT_MISS = 'RESULT_MISS';
  const traverse = ({
    isPseudoRoot = false,
    node,
    currentTreeIndex,
    pathIndex
  }) => {
    if (!isPseudoRoot && getNodeKey({
      node,
      treeIndex: currentTreeIndex
    }) !== path[pathIndex]) {
      return RESULT_MISS;
    }
    if (pathIndex >= path.length - 1) {
      return typeof newNode === 'function' ? newNode({
        node,
        treeIndex: currentTreeIndex
      }) : newNode;
    }
    if (!node.children) {
      throw new Error('Path referenced children of node with no children.');
    }
    let nextTreeIndex = currentTreeIndex + 1;
    for (let i = 0; i < node.children.length; i += 1) {
      const result = traverse({
        node: node.children[i],
        currentTreeIndex: nextTreeIndex,
        pathIndex: pathIndex + 1
      });
      if (result !== RESULT_MISS) {
        if (result) {
          return {
            ...node,
            children: [...node.children.slice(0, i), result, ...node.children.slice(i + 1)]
          };
        }
        return {
          ...node,
          children: [...node.children.slice(0, i), ...node.children.slice(i + 1)]
        };
      }
      nextTreeIndex += 1 + getDescendantCount({
        node: node.children[i],
        ignoreCollapsed
      });
    }
    return RESULT_MISS;
  };
  const result = traverse({
    node: {
      children: treeData
    },
    currentTreeIndex: -1,
    pathIndex: -1,
    isPseudoRoot: true
  });
  if (result === RESULT_MISS) {
    throw new Error('No node found at the given path.');
  }
  return result.children;
};
const removeNodeAtPath = ({
  treeData,
  path,
  getNodeKey,
  ignoreCollapsed = true
}) => {
  return changeNodeAtPath({
    treeData,
    path,
    getNodeKey,
    ignoreCollapsed,
    newNode: undefined
  });
};
const removeNode = ({
  treeData,
  path,
  getNodeKey,
  ignoreCollapsed = true
}) => {
  let removedNode;
  let removedTreeIndex;
  const nextTreeData = changeNodeAtPath({
    treeData,
    path,
    getNodeKey,
    ignoreCollapsed,
    newNode: ({
      node,
      treeIndex
    }) => {
      removedNode = node;
      removedTreeIndex = treeIndex;
      return undefined;
    }
  });
  return {
    treeData: nextTreeData,
    node: removedNode,
    treeIndex: removedTreeIndex
  };
};
const getNodeAtPath = ({
  treeData,
  path,
  getNodeKey,
  ignoreCollapsed = true
}) => {
  let foundNodeInfo;
  try {
    changeNodeAtPath({
      treeData,
      path,
      getNodeKey,
      ignoreCollapsed,
      newNode: ({
        node,
        treeIndex
      }) => {
        foundNodeInfo = {
          node,
          treeIndex
        };
        return node;
      }
    });
  } catch {}
  return foundNodeInfo;
};
const addNodeUnderParent = ({
  treeData,
  newNode,
  parentKey = undefined,
  getNodeKey,
  ignoreCollapsed = true,
  expandParent = false,
  addAsFirstChild = false
}) => {
  if (parentKey === null || parentKey === undefined) {
    return addAsFirstChild ? {
      treeData: [newNode, ...(treeData || [])],
      treeIndex: 0
    } : {
      treeData: [...(treeData || []), newNode],
      treeIndex: (treeData || []).length
    };
  }
  let insertedTreeIndex;
  let hasBeenAdded = false;
  const changedTreeData = map({
    treeData,
    getNodeKey,
    ignoreCollapsed,
    callback: ({
      node,
      treeIndex,
      path
    }) => {
      const key = path ? path[path.length - 1] : undefined;
      if (hasBeenAdded || key !== parentKey) {
        return node;
      }
      hasBeenAdded = true;
      const parentNode = {
        ...node
      };
      if (expandParent) {
        parentNode.expanded = true;
      }
      if (!parentNode.children) {
        insertedTreeIndex = treeIndex + 1;
        return {
          ...parentNode,
          children: [newNode]
        };
      }
      if (typeof parentNode.children === 'function') {
        throw new TypeError('Cannot add to children defined by a function');
      }
      let nextTreeIndex = treeIndex + 1;
      for (let i = 0; i < parentNode.children.length; i += 1) {
        nextTreeIndex += 1 + getDescendantCount({
          node: parentNode.children[i],
          ignoreCollapsed
        });
      }
      insertedTreeIndex = nextTreeIndex;
      const children = addAsFirstChild ? [newNode, ...parentNode.children] : [...parentNode.children, newNode];
      return {
        ...parentNode,
        children
      };
    }
  });
  if (!hasBeenAdded) {
    throw new Error('No node found with the given key.');
  }
  return {
    treeData: changedTreeData,
    treeIndex: insertedTreeIndex
  };
};
const addNodeAtDepthAndIndex = ({
  targetDepth,
  minimumTreeIndex,
  newNode,
  ignoreCollapsed,
  expandParent,
  isPseudoRoot = false,
  isLastChild,
  node,
  currentIndex,
  currentDepth,
  getNodeKey,
  path = []
}) => {
  const selfPath = n => isPseudoRoot ? [] : [...path, getNodeKey({
    node: n,
    treeIndex: currentIndex
  })];
  if (currentIndex >= minimumTreeIndex - 1 || isLastChild && !(node.children && node.children.length > 0)) {
    if (typeof node.children === 'function') {
      throw new TypeError('Cannot add to children defined by a function');
    } else {
      const extraNodeProps = expandParent ? {
        expanded: true
      } : {};
      const nextNode = {
        ...node,
        ...extraNodeProps,
        children: node.children ? [newNode, ...node.children] : [newNode]
      };
      return {
        node: nextNode,
        nextIndex: currentIndex + 2,
        insertedTreeIndex: currentIndex + 1,
        parentPath: selfPath(nextNode),
        parentNode: isPseudoRoot ? undefined : nextNode
      };
    }
  }
  if (currentDepth >= targetDepth - 1) {
    if (!node.children || typeof node.children === 'function' || node.expanded !== true && ignoreCollapsed && !isPseudoRoot) {
      return {
        node,
        nextIndex: currentIndex + 1
      };
    }
    let childIndex = currentIndex + 1;
    let insertedTreeIndex;
    let insertIndex;
    for (let i = 0; i < node.children.length; i += 1) {
      if (childIndex >= minimumTreeIndex) {
        insertedTreeIndex = childIndex;
        insertIndex = i;
        break;
      }
      childIndex += 1 + getDescendantCount({
        node: node.children[i],
        ignoreCollapsed
      });
    }
    if (insertIndex === null || insertIndex === undefined) {
      if (childIndex < minimumTreeIndex && !isLastChild) {
        return {
          node,
          nextIndex: childIndex
        };
      }
      insertedTreeIndex = childIndex;
      insertIndex = node.children.length;
    }
    const nextNode = {
      ...node,
      children: [...node.children.slice(0, insertIndex), newNode, ...node.children.slice(insertIndex)]
    };
    return {
      node: nextNode,
      nextIndex: childIndex,
      insertedTreeIndex,
      parentPath: selfPath(nextNode),
      parentNode: isPseudoRoot ? undefined : nextNode
    };
  }
  if (!node.children || typeof node.children === 'function' || node.expanded !== true && ignoreCollapsed && !isPseudoRoot) {
    return {
      node,
      nextIndex: currentIndex + 1
    };
  }
  let insertedTreeIndex;
  let pathFragment;
  let parentNode;
  let childIndex = currentIndex + 1;
  let newChildren = node.children;
  if (typeof newChildren !== 'function') {
    newChildren = newChildren.map((child, i) => {
      if (insertedTreeIndex !== null && insertedTreeIndex !== undefined) {
        return child;
      }
      const mapResult = addNodeAtDepthAndIndex({
        targetDepth,
        minimumTreeIndex,
        newNode,
        ignoreCollapsed,
        expandParent,
        isLastChild: isLastChild && i === newChildren.length - 1,
        node: child,
        currentIndex: childIndex,
        currentDepth: currentDepth + 1,
        getNodeKey,
        path: []
      });
      if ('insertedTreeIndex' in mapResult) {
        ({
          insertedTreeIndex,
          parentNode,
          parentPath: pathFragment
        } = mapResult);
      }
      childIndex = mapResult.nextIndex;
      return mapResult.node;
    });
  }
  const nextNode = {
    ...node,
    children: newChildren
  };
  const result = {
    node: nextNode,
    nextIndex: childIndex
  };
  if (insertedTreeIndex !== null && insertedTreeIndex !== undefined) {
    result.insertedTreeIndex = insertedTreeIndex;
    result.parentPath = [...selfPath(nextNode), ...pathFragment];
    result.parentNode = parentNode;
  }
  return result;
};
const insertNode = ({
  treeData,
  depth: targetDepth,
  minimumTreeIndex,
  newNode,
  getNodeKey,
  ignoreCollapsed = true,
  expandParent = false
}) => {
  if (!treeData && targetDepth === 0) {
    return {
      treeData: [newNode],
      treeIndex: 0,
      path: [getNodeKey({
        node: newNode,
        treeIndex: 0
      })],
      parentNode: undefined
    };
  }
  const insertResult = addNodeAtDepthAndIndex({
    targetDepth,
    minimumTreeIndex,
    newNode,
    ignoreCollapsed,
    expandParent,
    getNodeKey,
    isPseudoRoot: true,
    isLastChild: true,
    node: {
      children: treeData
    },
    currentIndex: -1,
    currentDepth: -1
  });
  if (!('insertedTreeIndex' in insertResult)) {
    throw new Error('No suitable position found to insert.');
  }
  const treeIndex = insertResult.insertedTreeIndex;
  return {
    treeData: insertResult.node.children,
    treeIndex,
    path: [...insertResult.parentPath, getNodeKey({
      node: newNode,
      treeIndex
    })],
    parentNode: insertResult.parentNode
  };
};
const getFlatDataFromTree = ({
  treeData,
  getNodeKey,
  ignoreCollapsed = true
}) => {
  if (!treeData || treeData.length === 0) {
    return [];
  }
  const flattened = [];
  walk({
    treeData,
    getNodeKey,
    ignoreCollapsed,
    callback: nodeInfo => {
      flattened.push(nodeInfo);
    }
  });
  return flattened;
};
const getTreeFromFlatData = ({
  flatData,
  getKey = node => node.id,
  getParentKey = node => node.parentId,
  rootKey = '0'
}) => {
  if (!flatData) {
    return [];
  }
  const childrenToParents = {};
  for (const child of flatData) {
    const parentKey = getParentKey(child);
    if (parentKey in childrenToParents) {
      childrenToParents[parentKey].push(child);
    } else {
      childrenToParents[parentKey] = [child];
    }
  }
  if (!(rootKey in childrenToParents)) {
    return [];
  }
  const trav = parent => {
    const parentKey = getKey(parent);
    if (parentKey in childrenToParents) {
      return {
        ...parent,
        children: childrenToParents[parentKey].map(child => trav(child))
      };
    }
    return {
      ...parent
    };
  };
  return childrenToParents[rootKey].map(child => trav(child));
};
const isDescendant = (older, younger) => {
  return !!older.children && typeof older.children !== 'function' && older.children.some(child => child === younger || isDescendant(child, younger));
};
const getDepth = (node, depth = 0) => {
  if (!node.children) {
    return depth;
  }
  if (typeof node.children === 'function') {
    return depth + 1;
  }
  return node.children.reduce((deepest, child) => Math.max(deepest, getDepth(child, depth + 1)), depth);
};
const find = ({
  getNodeKey,
  treeData,
  searchQuery,
  searchMethod,
  searchFocusOffset,
  expandAllMatchPaths = false,
  expandFocusMatchPaths = true
}) => {
  let matchCount = 0;
  const trav = ({
    isPseudoRoot = false,
    node,
    currentIndex,
    path = []
  }) => {
    let matches = [];
    let isSelfMatch = false;
    let hasFocusMatch = false;
    const selfPath = isPseudoRoot ? [] : [...path, getNodeKey({
      node,
      treeIndex: currentIndex
    })];
    const extraInfo = isPseudoRoot ? undefined : {
      path: selfPath,
      treeIndex: currentIndex
    };
    const hasChildren = node.children && typeof node.children !== 'function' && node.children.length > 0;
    if (!isPseudoRoot && searchMethod({
      ...extraInfo,
      node,
      searchQuery
    })) {
      if (matchCount === searchFocusOffset) {
        hasFocusMatch = true;
      }
      matchCount += 1;
      isSelfMatch = true;
    }
    let childIndex = currentIndex;
    const newNode = {
      ...node
    };
    if (hasChildren) {
      newNode.children = newNode.children.map(child => {
        const mapResult = trav({
          node: child,
          currentIndex: childIndex + 1,
          path: selfPath
        });
        if (mapResult.node.expanded) {
          childIndex = mapResult.treeIndex;
        } else {
          childIndex += 1;
        }
        if (mapResult.matches.length > 0 || mapResult.hasFocusMatch) {
          matches = [...matches, ...mapResult.matches];
          if (mapResult.hasFocusMatch) {
            hasFocusMatch = true;
          }
          if (expandAllMatchPaths && mapResult.matches.length > 0 || (expandAllMatchPaths || expandFocusMatchPaths) && mapResult.hasFocusMatch) {
            newNode.expanded = true;
          }
        }
        return mapResult.node;
      });
    }
    if (!isPseudoRoot && !newNode.expanded) {
      matches = matches.map(match => ({
        ...match,
        treeIndex: undefined
      }));
    }
    if (isSelfMatch) {
      matches = [{
        ...extraInfo,
        node: newNode
      }, ...matches];
    }
    return {
      node: matches.length > 0 ? newNode : node,
      matches,
      hasFocusMatch,
      treeIndex: childIndex
    };
  };
  const result = trav({
    node: {
      children: treeData
    },
    isPseudoRoot: true,
    currentIndex: -1
  });
  return {
    matches: result.matches,
    treeData: result.node.children
  };
};

const classnames = (...classes) => classes.filter(Boolean).join(' ');

const defaultProps$3 = {
  isSearchMatch: false,
  isSearchFocus: false,
  canDrag: false,
  toggleChildrenVisibility: undefined,
  buttons: [],
  className: '',
  style: {},
  parentNode: undefined,
  draggedNode: undefined,
  canDrop: false,
  title: undefined,
  subtitle: undefined,
  rowDirection: 'ltr'
};
const NodeRendererDefault = function (props) {
  props = {
    ...defaultProps$3,
    ...props
  };
  const {
    scaffoldBlockPxWidth,
    toggleChildrenVisibility,
    connectDragPreview,
    connectDragSource,
    isDragging,
    canDrop,
    canDrag,
    node,
    title,
    subtitle,
    draggedNode,
    path,
    treeIndex,
    isSearchMatch,
    isSearchFocus,
    buttons,
    className,
    style,
    didDrop,
    treeId: _treeId,
    isOver: _isOver,
    parentNode: _parentNode,
    rowDirection,
    ...otherProps
  } = props;
  const nodeTitle = title || node.title;
  const nodeSubtitle = subtitle || node.subtitle;
  const rowDirectionClass = rowDirection === 'rtl' ? 'rst__rtl' : undefined;
  let handle;
  if (canDrag) {
    handle = typeof node.children === 'function' && node.expanded ? jsxRuntime.jsx("div", {
      className: "rst__loadingHandle",
      children: jsxRuntime.jsx("div", {
        className: "rst__loadingCircle",
        children: Array.from({
          length: 12
        }).map((_, index) => jsxRuntime.jsx("div", {
          className: classnames('rst__loadingCirclePoint', rowDirectionClass ?? '')
        }, index))
      })
    }) : connectDragSource(jsxRuntime.jsx("div", {
      className: "rst__moveHandle"
    }), {
      dropEffect: 'copy'
    });
  }
  const isDraggedDescendant = draggedNode && isDescendant(draggedNode, node);
  const isLandingPadActive = !didDrop && isDragging;
  let buttonStyle = {
    left: -0.5 * scaffoldBlockPxWidth,
    right: 0
  };
  if (rowDirection === 'rtl') {
    buttonStyle = {
      right: -0.5 * scaffoldBlockPxWidth,
      left: 0
    };
  }
  return jsxRuntime.jsxs("div", {
    style: {
      height: '100%'
    },
    ...otherProps,
    children: [toggleChildrenVisibility && node.children && (node.children.length > 0 || typeof node.children === 'function') && jsxRuntime.jsxs("div", {
      children: [jsxRuntime.jsx("button", {
        type: "button",
        "aria-label": node.expanded ? 'Collapse' : 'Expand',
        className: classnames(node.expanded ? 'rst__collapseButton' : 'rst__expandButton', rowDirectionClass ?? ''),
        style: buttonStyle,
        onClick: () => toggleChildrenVisibility({
          node,
          path,
          treeIndex
        })
      }), node.expanded && !isDragging && jsxRuntime.jsx("div", {
        style: {
          width: scaffoldBlockPxWidth
        },
        className: classnames('rst__lineChildren', rowDirectionClass ?? '')
      })]
    }), jsxRuntime.jsx("div", {
      className: classnames('rst__rowWrapper', rowDirectionClass ?? ''),
      children: connectDragPreview(jsxRuntime.jsxs("div", {
        className: classnames('rst__row', isLandingPadActive ? 'rst__rowLandingPad' : '', isLandingPadActive && !canDrop ? 'rst__rowCancelPad' : '', isSearchMatch ? 'rst__rowSearchMatch' : '', isSearchFocus ? 'rst__rowSearchFocus' : '', rowDirectionClass ?? '', className ?? ''),
        style: {
          opacity: isDraggedDescendant ? 0.5 : 1,
          ...style
        },
        children: [handle, jsxRuntime.jsxs("div", {
          className: classnames('rst__rowContents', canDrag ? '' : 'rst__rowContentsDragDisabled', rowDirectionClass ?? ''),
          children: [jsxRuntime.jsxs("div", {
            className: classnames('rst__rowLabel', rowDirectionClass ?? ''),
            children: [jsxRuntime.jsx("span", {
              className: classnames('rst__rowTitle', node.subtitle ? 'rst__rowTitleWithSubtitle' : ''),
              children: typeof nodeTitle === 'function' ? nodeTitle({
                node,
                path,
                treeIndex
              }) : nodeTitle
            }), nodeSubtitle && jsxRuntime.jsx("span", {
              className: "rst__rowSubtitle",
              children: typeof nodeSubtitle === 'function' ? nodeSubtitle({
                node,
                path,
                treeIndex
              }) : nodeSubtitle
            })]
          }), jsxRuntime.jsx("div", {
            className: "rst__rowToolbar",
            children: buttons?.map((btn, index) => jsxRuntime.jsx("div", {
              className: "rst__toolbarButton",
              children: btn
            }, index))
          })]
        })]
      }))
    })]
  });
};

const defaultProps$2 = {
  isOver: false,
  canDrop: false
};
const PlaceholderRendererDefault = function (props) {
  props = {
    ...defaultProps$2,
    ...props
  };
  const {
    canDrop,
    isOver
  } = props;
  return jsxRuntime.jsx("div", {
    className: classnames('rst__placeholder', canDrop ? 'rst__placeholderLandingPad' : '', canDrop && !isOver ? 'rst__placeholderCancelPad' : '')
  });
};

const defaultProps$1 = {
  swapFrom: undefined,
  swapDepth: undefined,
  swapLength: undefined,
  canDrop: false,
  draggedNode: undefined,
  rowDirection: 'ltr'
};
class TreeNodeComponent extends React.Component {
  render() {
    const props = {
      ...defaultProps$1,
      ...this.props
    };
    const {
      children,
      listIndex,
      swapFrom,
      swapLength,
      swapDepth,
      scaffoldBlockPxWidth,
      lowerSiblingCounts,
      connectDropTarget,
      isOver,
      draggedNode,
      canDrop,
      treeIndex,
      rowHeight,
      treeId: _treeId,
      getPrevRow: _getPrevRow,
      node: _node,
      path: _path,
      rowDirection,
      ...otherProps
    } = props;
    const rowDirectionClass = rowDirection === 'rtl' ? 'rst__rtl' : undefined;
    const scaffoldBlockCount = lowerSiblingCounts.length;
    const scaffold = [];
    for (const [i, lowerSiblingCount] of lowerSiblingCounts.entries()) {
      let lineClass = '';
      if (lowerSiblingCount > 0) {
        if (listIndex === 0) {
          lineClass = 'rst__lineHalfHorizontalRight rst__lineHalfVerticalBottom';
        } else if (i === scaffoldBlockCount - 1) {
          lineClass = 'rst__lineHalfHorizontalRight rst__lineFullVertical';
        } else {
          lineClass = 'rst__lineFullVertical';
        }
      } else if (listIndex === 0) {
        lineClass = 'rst__lineHalfHorizontalRight';
      } else if (i === scaffoldBlockCount - 1) {
        lineClass = 'rst__lineHalfVerticalTop rst__lineHalfHorizontalRight';
      }
      scaffold.push(jsxRuntime.jsx("div", {
        style: {
          width: scaffoldBlockPxWidth
        },
        className: classnames('rst__lineBlock', lineClass, rowDirectionClass ?? '')
      }, `pre_${1 + i}`));
      if (treeIndex !== listIndex && i === swapDepth) {
        let highlightLineClass = '';
        if (listIndex === swapFrom + swapLength - 1) {
          highlightLineClass = 'rst__highlightBottomLeftCorner';
        } else if (treeIndex === swapFrom) {
          highlightLineClass = 'rst__highlightTopLeftCorner';
        } else {
          highlightLineClass = 'rst__highlightLineVertical';
        }
        const style = rowDirection === 'rtl' ? {
          width: scaffoldBlockPxWidth,
          right: scaffoldBlockPxWidth * i
        } : {
          width: scaffoldBlockPxWidth,
          left: scaffoldBlockPxWidth * i
        };
        scaffold.push(jsxRuntime.jsx("div", {
          style: style,
          className: classnames('rst__absoluteLineBlock', highlightLineClass, rowDirectionClass ?? '')
        }, i));
      }
    }
    const style = rowDirection === 'rtl' ? {
      right: scaffoldBlockPxWidth * scaffoldBlockCount
    } : {
      left: scaffoldBlockPxWidth * scaffoldBlockCount
    };
    let calculatedRowHeight = rowHeight;
    if (typeof rowHeight === 'function') {
      calculatedRowHeight = rowHeight(treeIndex, _node, _path);
    }
    return connectDropTarget(jsxRuntime.jsxs("div", {
      ...otherProps,
      style: {
        height: `${calculatedRowHeight}px`
      },
      className: classnames('rst__node', rowDirectionClass ?? ''),
      ref: node => this.node = node,
      children: [scaffold, jsxRuntime.jsx("div", {
        className: "rst__nodeContent",
        style: style,
        children: React.Children.map(children, child => React.cloneElement(child, {
          isOver,
          canDrop,
          draggedNode
        }))
      })]
    }));
  }
}

const defaultProps = {
  canDrop: false,
  draggedNode: undefined
};
const TreePlaceholder = props => {
  props = {
    ...defaultProps,
    ...props
  };
  const {
    children,
    connectDropTarget,
    treeId,
    drop,
    ...otherProps
  } = props;
  return connectDropTarget(jsxRuntime.jsx("div", {
    children: React.Children.map(children, child => React.cloneElement(child, {
      ...otherProps
    }))
  }));
};

let rafId = 0;
const nodeDragSourcePropInjection = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  connectDragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging(),
  didDrop: monitor.didDrop()
});
const wrapSource = (el, startDrag, endDrag, dndType) => {
  const nodeDragSource = {
    beginDrag: props => {
      startDrag(props);
      return {
        node: props.node,
        parentNode: props.parentNode,
        path: props.path,
        treeIndex: props.treeIndex,
        treeId: props.treeId
      };
    },
    endDrag: (props, monitor) => {
      endDrag(monitor.getDropResult());
    },
    isDragging: (props, monitor) => {
      const dropTargetNode = monitor.getItem().node;
      const draggedNode = props.node;
      return draggedNode === dropTargetNode;
    }
  };
  return reactDnd.DragSource(dndType, nodeDragSource, nodeDragSourcePropInjection)(el);
};
const propInjection = (connect, monitor) => {
  const dragged = monitor.getItem();
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
    draggedNode: dragged ? dragged.node : undefined
  };
};
const wrapPlaceholder = (el, treeId, drop, dndType) => {
  const placeholderDropTarget = {
    drop: (dropTargetProps, monitor) => {
      const {
        node,
        path,
        treeIndex
      } = monitor.getItem();
      const result = {
        node,
        path,
        treeIndex,
        treeId,
        minimumTreeIndex: 0,
        depth: 0
      };
      drop(result);
      return result;
    }
  };
  return reactDnd.DropTarget(dndType, placeholderDropTarget, propInjection)(el);
};
const getTargetDepth = (dropTargetProps, monitor, component, canNodeHaveChildren, treeId, maxDepth) => {
  let dropTargetDepth = 0;
  const rowAbove = dropTargetProps.getPrevRow();
  if (rowAbove) {
    const {
      node
    } = rowAbove;
    let {
      path
    } = rowAbove;
    const aboveNodeCannotHaveChildren = !canNodeHaveChildren(node);
    if (aboveNodeCannotHaveChildren) {
      path = path.slice(0, -1);
    }
    dropTargetDepth = Math.min(path.length, dropTargetProps.path.length);
  }
  let blocksOffset;
  let dragSourceInitialDepth = (monitor.getItem().path || []).length;
  if (monitor.getItem().treeId === treeId) {
    const direction = dropTargetProps.rowDirection === 'rtl' ? -1 : 1;
    blocksOffset = Math.round(direction * monitor.getDifferenceFromInitialOffset().x / dropTargetProps.scaffoldBlockPxWidth);
  } else {
    dragSourceInitialDepth = 0;
    if (component) {
      const relativePosition = component.node.getBoundingClientRect();
      const leftShift = monitor.getSourceClientOffset().x - relativePosition.left;
      blocksOffset = Math.round(leftShift / dropTargetProps.scaffoldBlockPxWidth);
    } else {
      blocksOffset = dropTargetProps.path.length;
    }
  }
  let targetDepth = Math.min(dropTargetDepth, Math.max(0, dragSourceInitialDepth + blocksOffset - 1));
  if (maxDepth !== undefined && maxDepth !== undefined) {
    const draggedNode = monitor.getItem().node;
    const draggedChildDepth = getDepth(draggedNode);
    targetDepth = Math.max(0, Math.min(targetDepth, maxDepth - draggedChildDepth - 1));
  }
  return targetDepth;
};
const canDrop = (dropTargetProps, monitor, canNodeHaveChildren, treeId, maxDepth, treeRefcanDrop, draggingTreeData, treeReftreeData, getNodeKey) => {
  if (!monitor.isOver()) {
    return false;
  }
  const rowAbove = dropTargetProps.getPrevRow();
  const abovePath = rowAbove ? rowAbove.path : [];
  const aboveNode = rowAbove ? rowAbove.node : {};
  const targetDepth = getTargetDepth(dropTargetProps, monitor, undefined, canNodeHaveChildren, treeId, maxDepth);
  if (targetDepth >= abovePath.length && typeof aboveNode.children === 'function') {
    return false;
  }
  if (typeof treeRefcanDrop === 'function') {
    const {
      node
    } = monitor.getItem();
    return treeRefcanDrop({
      node,
      prevPath: monitor.getItem().path,
      prevParent: monitor.getItem().parentNode,
      prevTreeIndex: monitor.getItem().treeIndex,
      nextPath: dropTargetProps.children.props.path,
      nextParent: dropTargetProps.children.props.parentNode,
      nextTreeIndex: dropTargetProps.children.props.treeIndex
    });
  }
  return true;
};
const wrapTarget = (el, canNodeHaveChildren, treeId, maxDepth, treeRefcanDrop, drop, dragHover, dndType, draggingTreeData, treeReftreeData, getNodeKey) => {
  const nodeDropTarget = {
    drop: (dropTargetProps, monitor, component) => {
      const result = {
        node: monitor.getItem().node,
        path: monitor.getItem().path,
        treeIndex: monitor.getItem().treeIndex,
        treeId,
        minimumTreeIndex: dropTargetProps.treeIndex,
        depth: getTargetDepth(dropTargetProps, monitor, component, canNodeHaveChildren, treeId, maxDepth)
      };
      drop(result);
      return result;
    },
    hover: (dropTargetProps, monitor, component) => {
      const targetDepth = getTargetDepth(dropTargetProps, monitor, component, canNodeHaveChildren, treeId, maxDepth);
      const draggedNode = monitor.getItem().node;
      const needsRedraw = dropTargetProps.node !== draggedNode || targetDepth !== dropTargetProps.path.length - 1;
      if (!needsRedraw) {
        return;
      }
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const item = monitor.getItem();
        if (!item || !monitor.isOver()) {
          return;
        }
        dragHover({
          node: draggedNode,
          path: item.path,
          minimumTreeIndex: dropTargetProps.listIndex,
          depth: targetDepth
        });
      });
    },
    canDrop: (dropTargetProps, monitor) => canDrop(dropTargetProps, monitor, canNodeHaveChildren, treeId, maxDepth, treeRefcanDrop)
  };
  return reactDnd.DropTarget(dndType, nodeDropTarget, propInjection)(el);
};

const slideRows = (rows, fromIndex, toIndex, count = 1) => {
  const rowsWithoutMoved = [...rows.slice(0, fromIndex), ...rows.slice(fromIndex + count)];
  return [...rowsWithoutMoved.slice(0, toIndex), ...rows.slice(fromIndex, fromIndex + count), ...rowsWithoutMoved.slice(toIndex)];
};

const memoize = f => {
  let savedArgsArray = [];
  let savedKeysArray = [];
  let savedResult;
  return args => {
    const keysArray = Object.keys(args).sort();
    const argsArray = keysArray.map(key => args[key]);
    if (argsArray.length !== savedArgsArray.length || argsArray.some((arg, index) => arg !== savedArgsArray[index]) || keysArray.some((key, index) => key !== savedKeysArray[index])) {
      savedArgsArray = argsArray;
      savedKeysArray = keysArray;
      savedResult = f(args);
    }
    return savedResult;
  };
};
const memoizedInsertNode = memoize(insertNode);
const memoizedGetFlatDataFromTree = memoize(getFlatDataFromTree);
const memoizedGetDescendantCount = memoize(getDescendantCount);

let treeIdCounter = 1;
const mergeTheme = props => {
  const merged = {
    ...props,
    style: {
      ...props.theme.style,
      ...props.style
    },
    innerStyle: {
      ...props.theme.innerStyle,
      ...props.innerStyle
    }
  };
  const overridableDefaults = {
    nodeContentRenderer: NodeRendererDefault,
    placeholderRenderer: PlaceholderRendererDefault,
    scaffoldBlockPxWidth: 44,
    slideRegionSize: 100,
    rowHeight: 62,
    treeNodeRenderer: TreeNodeComponent
  };
  for (const propKey of Object.keys(overridableDefaults)) {
    if (props[propKey] === undefined) {
      merged[propKey] = props.theme[propKey] === undefined ? overridableDefaults[propKey] : props.theme[propKey];
    }
  }
  return merged;
};
class ReactSortableTree extends React.Component {
  static search(props, state, seekIndex, expand, singleSearch) {
    const {
      onChange,
      getNodeKey,
      searchFinishCallback,
      searchQuery,
      searchMethod,
      searchFocusOffset,
      onlyExpandSearchedNodes
    } = props;
    const {
      instanceProps
    } = state;
    if (!searchQuery && !searchMethod) {
      if (searchFinishCallback) {
        searchFinishCallback([]);
      }
      return {
        searchMatches: []
      };
    }
    const newState = {
      instanceProps: {}
    };
    const {
      treeData: expandedTreeData,
      matches: searchMatches
    } = find({
      getNodeKey,
      treeData: onlyExpandSearchedNodes ? toggleExpandedForAll({
        treeData: instanceProps.treeData,
        expanded: false
      }) : instanceProps.treeData,
      searchQuery,
      searchMethod: searchMethod || defaultSearchMethod,
      searchFocusOffset,
      expandAllMatchPaths: expand && !singleSearch,
      expandFocusMatchPaths: !!expand
    });
    if (expand) {
      newState.instanceProps.ignoreOneTreeUpdate = true;
      onChange(expandedTreeData);
    }
    if (searchFinishCallback) {
      searchFinishCallback(searchMatches);
    }
    let searchFocusTreeIndex;
    if (seekIndex && searchFocusOffset !== undefined && searchFocusOffset < searchMatches.length) {
      searchFocusTreeIndex = searchMatches[searchFocusOffset].treeIndex;
    }
    newState.searchMatches = searchMatches;
    newState.searchFocusTreeIndex = searchFocusTreeIndex;
    return newState;
  }
  static loadLazyChildren(props, state) {
    const {
      instanceProps
    } = state;
    walk({
      treeData: instanceProps.treeData,
      getNodeKey: props.getNodeKey,
      callback: ({
        node,
        path,
        lowerSiblingCounts,
        treeIndex
      }) => {
        if (node.children && typeof node.children === 'function' && (node.expanded || props.loadCollapsedLazyChildren)) {
          node.children({
            node,
            path,
            lowerSiblingCounts,
            treeIndex,
            done: childrenArray => props.onChange(changeNodeAtPath({
              treeData: instanceProps.treeData,
              path,
              newNode: ({
                node: oldNode
              }) => oldNode === node ? {
                ...oldNode,
                children: childrenArray
              } : oldNode,
              getNodeKey: props.getNodeKey
            }))
          });
        }
      }
    });
  }
  constructor(props) {
    super(props);
    this.listRef = props.virtuosoRef || React.createRef();
    this.listProps = props.virtuosoProps || {};
    const {
      dndType,
      nodeContentRenderer,
      treeNodeRenderer,
      slideRegionSize
    } = mergeTheme(props);
    this.treeId = `rst__${treeIdCounter}`;
    treeIdCounter += 1;
    this.dndType = dndType || this.treeId;
    this.nodeContentRenderer = wrapSource(nodeContentRenderer, this.startDrag, this.endDrag, this.dndType);
    this.treePlaceholderRenderer = wrapPlaceholder(TreePlaceholder, this.treeId, this.drop, this.dndType);
    this.scrollZoneVirtualList = (withScrolling.createScrollingComponent || withScrolling)(React.forwardRef((props, ref) => {
      const {
        dragDropManager,
        rowHeight,
        ...otherProps
      } = props;
      return jsxRuntime.jsx(reactVirtuoso.Virtuoso, {
        ref: this.listRef,
        scrollerRef: scrollContainer => ref.current = scrollContainer,
        ...otherProps
      });
    }));
    this.vStrength = withScrolling.createVerticalStrength(slideRegionSize);
    this.hStrength = withScrolling.createHorizontalStrength(slideRegionSize);
    this.state = {
      draggingTreeData: undefined,
      draggedNode: undefined,
      draggedMinimumTreeIndex: undefined,
      draggedDepth: undefined,
      searchMatches: [],
      searchFocusTreeIndex: undefined,
      dragging: false,
      instanceProps: {
        treeData: [],
        ignoreOneTreeUpdate: false,
        searchQuery: undefined,
        searchFocusOffset: undefined
      }
    };
    this.treeNodeRenderer = wrapTarget(treeNodeRenderer, this.canNodeHaveChildren, this.treeId, this.props.maxDepth, this.props.canDrop, this.drop, this.dragHover, this.dndType, this.state.draggingTreeData, this.props.treeData, this.props.getNodeKey);
    this.toggleChildrenVisibility = this.toggleChildrenVisibility.bind(this);
    this.moveNode = this.moveNode.bind(this);
    this.startDrag = this.startDrag.bind(this);
    this.dragHover = this.dragHover.bind(this);
    this.endDrag = this.endDrag.bind(this);
    this.drop = this.drop.bind(this);
    this.handleDndMonitorChange = this.handleDndMonitorChange.bind(this);
  }
  componentDidMount() {
    ReactSortableTree.loadLazyChildren(this.props, this.state);
    const stateUpdate = ReactSortableTree.search(this.props, this.state, true, true, false);
    this.setState(stateUpdate);
    this.clearMonitorSubscription = this.props.dragDropManager.getMonitor().subscribeToStateChange(this.handleDndMonitorChange);
  }
  static getDerivedStateFromProps(nextProps, prevState) {
    const {
      instanceProps
    } = prevState;
    const newState = {};
    const newInstanceProps = {
      ...instanceProps
    };
    const isTreeDataEqual = isEqual(instanceProps.treeData, nextProps.treeData);
    newInstanceProps.treeData = nextProps.treeData;
    if (!isTreeDataEqual) {
      if (instanceProps.ignoreOneTreeUpdate) {
        newInstanceProps.ignoreOneTreeUpdate = false;
      } else {
        newState.searchFocusTreeIndex = undefined;
        ReactSortableTree.loadLazyChildren(nextProps, prevState);
        Object.assign(newState, ReactSortableTree.search(nextProps, prevState, false, false, false));
      }
      newState.draggingTreeData = undefined;
      newState.draggedNode = undefined;
      newState.draggedMinimumTreeIndex = undefined;
      newState.draggedDepth = undefined;
      newState.dragging = false;
    } else if (!isEqual(instanceProps.searchQuery, nextProps.searchQuery)) {
      Object.assign(newState, ReactSortableTree.search(nextProps, prevState, true, true, false));
    } else if (instanceProps.searchFocusOffset !== nextProps.searchFocusOffset) {
      Object.assign(newState, ReactSortableTree.search(nextProps, prevState, true, true, true));
    }
    newInstanceProps.searchQuery = nextProps.searchQuery;
    newInstanceProps.searchFocusOffset = nextProps.searchFocusOffset;
    newState.instanceProps = {
      ...newInstanceProps,
      ...newState.instanceProps
    };
    return newState;
  }
  componentDidUpdate(prevProps, prevState) {
    if (this.state.dragging !== prevState.dragging && this.props.onDragStateChanged) {
      this.props.onDragStateChanged({
        isDragging: this.state.dragging,
        draggedNode: this.state.draggedNode
      });
    }
  }
  componentWillUnmount() {
    this.clearMonitorSubscription();
  }
  handleDndMonitorChange() {
    const monitor = this.props.dragDropManager.getMonitor();
    if (!monitor.isDragging() && this.state.draggingTreeData) {
      setTimeout(() => {
        this.endDrag();
      });
    }
  }
  getRows(treeData) {
    return memoizedGetFlatDataFromTree({
      ignoreCollapsed: true,
      getNodeKey: this.props.getNodeKey,
      treeData
    });
  }
  startDrag = ({
    path
  }) => {
    this.setState(prevState => {
      const {
        treeData: draggingTreeData,
        node: draggedNode,
        treeIndex: draggedMinimumTreeIndex
      } = removeNode({
        treeData: prevState.instanceProps.treeData,
        path,
        getNodeKey: this.props.getNodeKey
      });
      return {
        draggingTreeData,
        draggedNode,
        draggedDepth: path.length - 1,
        draggedMinimumTreeIndex,
        dragging: true
      };
    });
  };
  dragHover = ({
    node: draggedNode,
    depth: draggedDepth,
    minimumTreeIndex: draggedMinimumTreeIndex
  }) => {
    if (this.state.draggedDepth === draggedDepth && this.state.draggedMinimumTreeIndex === draggedMinimumTreeIndex) {
      return;
    }
    this.setState(({
      draggingTreeData,
      instanceProps
    }) => {
      const newDraggingTreeData = draggingTreeData || instanceProps.treeData;
      const addedResult = memoizedInsertNode({
        treeData: newDraggingTreeData,
        newNode: draggedNode,
        depth: draggedDepth,
        minimumTreeIndex: draggedMinimumTreeIndex,
        expandParent: true,
        getNodeKey: this.props.getNodeKey
      });
      const rows = this.getRows(addedResult.treeData);
      const expandedParentPath = rows[addedResult.treeIndex].path;
      return {
        draggedNode,
        draggedDepth,
        draggedMinimumTreeIndex,
        draggingTreeData: changeNodeAtPath({
          treeData: newDraggingTreeData,
          path: expandedParentPath.slice(0, -1),
          newNode: ({
            node
          }) => ({
            ...node,
            expanded: true
          }),
          getNodeKey: this.props.getNodeKey
        }),
        searchFocusTreeIndex: undefined,
        dragging: true
      };
    });
  };
  endDrag = dropResult => {
    const {
      instanceProps
    } = this.state;
    if (!dropResult) {
      this.setState({
        draggingTreeData: undefined,
        draggedNode: undefined,
        draggedMinimumTreeIndex: undefined,
        draggedDepth: undefined,
        dragging: false
      });
    } else if (dropResult.treeId !== this.treeId) {
      const {
        node,
        path,
        treeIndex
      } = dropResult;
      let shouldCopy = this.props.shouldCopyOnOutsideDrop;
      if (typeof shouldCopy === 'function') {
        shouldCopy = shouldCopy({
          node,
          prevTreeIndex: treeIndex,
          prevPath: path
        });
      }
      let treeData = this.state.draggingTreeData || instanceProps.treeData;
      if (shouldCopy) {
        treeData = changeNodeAtPath({
          treeData: instanceProps.treeData,
          path,
          newNode: ({
            node: copyNode
          }) => ({
            ...copyNode
          }),
          getNodeKey: this.props.getNodeKey
        });
      }
      this.props.onChange(treeData);
      this.props.onMoveNode({
        treeData,
        node,
        treeIndex: undefined,
        path: undefined,
        nextPath: undefined,
        nextTreeIndex: undefined,
        prevPath: path,
        prevTreeIndex: treeIndex
      });
    }
  };
  drop = dropResult => {
    this.moveNode(dropResult);
  };
  canNodeHaveChildren = node => {
    const {
      canNodeHaveChildren
    } = this.props;
    if (canNodeHaveChildren) {
      return canNodeHaveChildren(node);
    }
    return true;
  };
  toggleChildrenVisibility({
    node: targetNode,
    path
  }) {
    const {
      instanceProps
    } = this.state;
    const treeData = changeNodeAtPath({
      treeData: instanceProps.treeData,
      path,
      newNode: ({
        node
      }) => ({
        ...node,
        expanded: !node.expanded
      }),
      getNodeKey: this.props.getNodeKey
    });
    this.props.onChange(treeData);
    this.props.onVisibilityToggle({
      treeData,
      node: targetNode,
      expanded: !targetNode.expanded,
      path
    });
  }
  moveNode({
    node,
    path: prevPath,
    treeIndex: prevTreeIndex,
    depth,
    minimumTreeIndex
  }) {
    const {
      treeData,
      treeIndex,
      path,
      parentNode: nextParentNode
    } = insertNode({
      treeData: this.state.draggingTreeData,
      newNode: node,
      depth,
      minimumTreeIndex,
      expandParent: true,
      getNodeKey: this.props.getNodeKey
    });
    this.props.onChange(treeData);
    this.props.onMoveNode({
      treeData,
      node,
      treeIndex,
      path,
      nextPath: path,
      nextTreeIndex: treeIndex,
      prevPath,
      prevTreeIndex,
      nextParentNode
    });
  }
  renderRow(row, {
    listIndex,
    style,
    getPrevRow,
    matchKeys,
    swapFrom,
    swapDepth,
    swapLength
  }) {
    const {
      node,
      parentNode,
      path,
      lowerSiblingCounts,
      treeIndex
    } = row;
    const {
      canDrag,
      generateNodeProps,
      scaffoldBlockPxWidth,
      searchFocusOffset,
      rowDirection,
      rowHeight
    } = mergeTheme(this.props);
    const TreeNodeRenderer = this.treeNodeRenderer;
    const NodeContentRenderer = this.nodeContentRenderer;
    const nodeKey = path[path.length - 1];
    const isSearchMatch = (nodeKey in matchKeys);
    const isSearchFocus = isSearchMatch && matchKeys[nodeKey] === searchFocusOffset;
    const callbackParams = {
      node,
      parentNode,
      path,
      lowerSiblingCounts,
      treeIndex,
      isSearchMatch,
      isSearchFocus
    };
    const nodeProps = generateNodeProps ? generateNodeProps(callbackParams) : {};
    const rowCanDrag = typeof canDrag === 'function' ? canDrag(callbackParams) : canDrag;
    const sharedProps = {
      treeIndex,
      scaffoldBlockPxWidth,
      node,
      path,
      treeId: this.treeId,
      rowDirection
    };
    return jsxRuntime.jsx(TreeNodeRenderer, {
      style: style,
      rowHeight: rowHeight,
      listIndex: listIndex,
      getPrevRow: getPrevRow,
      lowerSiblingCounts: lowerSiblingCounts,
      swapFrom: swapFrom,
      swapLength: swapLength,
      swapDepth: swapDepth,
      ...sharedProps,
      children: jsxRuntime.jsx(NodeContentRenderer, {
        parentNode: parentNode,
        isSearchMatch: isSearchMatch,
        isSearchFocus: isSearchFocus,
        canDrag: rowCanDrag,
        toggleChildrenVisibility: this.toggleChildrenVisibility,
        ...sharedProps,
        ...nodeProps
      })
    }, nodeKey);
  }
  render() {
    const {
      dragDropManager,
      style,
      className,
      innerStyle,
      placeholderRenderer,
      getNodeKey,
      rowDirection
    } = mergeTheme(this.props);
    const {
      searchMatches,
      searchFocusTreeIndex,
      draggedNode,
      draggedDepth,
      draggedMinimumTreeIndex,
      instanceProps
    } = this.state;
    const treeData = this.state.draggingTreeData || instanceProps.treeData;
    const rowDirectionClass = rowDirection === 'rtl' ? 'rst__rtl' : undefined;
    let rows;
    let swapFrom;
    let swapLength;
    if (draggedNode && draggedMinimumTreeIndex !== undefined) {
      const addedResult = memoizedInsertNode({
        treeData,
        newNode: draggedNode,
        depth: draggedDepth,
        minimumTreeIndex: draggedMinimumTreeIndex,
        expandParent: true,
        getNodeKey
      });
      const swapTo = draggedMinimumTreeIndex;
      swapFrom = addedResult.treeIndex;
      swapLength = 1 + memoizedGetDescendantCount({
        node: draggedNode
      });
      rows = slideRows(this.getRows(addedResult.treeData), swapFrom, swapTo, swapLength);
    } else {
      rows = this.getRows(treeData);
    }
    const matchKeys = {};
    for (const [i, {
      path
    }] of searchMatches.entries()) {
      matchKeys[path[path.length - 1]] = i;
    }
    // if (searchFocusTreeIndex !== undefined) {
    //   this.listRef.current.scrollToIndex({
    //     index: searchFocusTreeIndex,
    //     align: 'center'
    //   });
    // }
    let containerStyle = style;
    let list;
    if (rows.length === 0) {
      const Placeholder = this.treePlaceholderRenderer;
      const PlaceholderContent = placeholderRenderer;
      list = jsxRuntime.jsx(Placeholder, {
        treeId: this.treeId,
        drop: this.drop,
        children: jsxRuntime.jsx(PlaceholderContent, {})
      });
    } else {
      containerStyle = {
        height: '100%',
        ...containerStyle
      };
      const ScrollZoneVirtualList = this.scrollZoneVirtualList;
      list = jsxRuntime.jsx(ScrollZoneVirtualList, {
        data: rows,
        dragDropManager: dragDropManager,
        verticalStrength: this.vStrength,
        horizontalStrength: this.hStrength,
        className: "rst__virtualScrollOverride",
        style: innerStyle,
        itemContent: index => this.renderRow(rows[index], {
          listIndex: index,
          getPrevRow: () => rows[index - 1] || undefined,
          matchKeys,
          swapFrom,
          swapDepth: draggedDepth,
          swapLength
        }),
        ...this.listProps
      });
    }
    return jsxRuntime.jsx("div", {
      className: classnames('rst__tree', className, rowDirectionClass),
      style: containerStyle,
      children: list
    });
  }
}
ReactSortableTree.defaultProps = {
  canDrag: true,
  canDrop: undefined,
  canNodeHaveChildren: () => true,
  className: '',
  dndType: undefined,
  generateNodeProps: undefined,
  getNodeKey: defaultGetNodeKey,
  innerStyle: {},
  maxDepth: undefined,
  treeNodeRenderer: undefined,
  nodeContentRenderer: undefined,
  onMoveNode: () => {},
  onVisibilityToggle: () => {},
  placeholderRenderer: undefined,
  scaffoldBlockPxWidth: undefined,
  searchFinishCallback: undefined,
  searchFocusOffset: undefined,
  searchMethod: undefined,
  searchQuery: undefined,
  shouldCopyOnOutsideDrop: false,
  slideRegionSize: undefined,
  style: {},
  theme: {},
  onDragStateChanged: () => {},
  onlyExpandSearchedNodes: false,
  rowDirection: 'ltr',
  debugMode: false,
  overscan: 0
};
const SortableTreeWithoutDndContext = function (props) {
  return jsxRuntime.jsx(reactDnd.DndContext.Consumer, {
    children: ({
      dragDropManager
    }) => dragDropManager === undefined ? undefined : jsxRuntime.jsx(ReactSortableTree, {
      ...props,
      dragDropManager: dragDropManager
    })
  });
};
const SortableTree = function (props) {
  return jsxRuntime.jsx(reactDnd.DndProvider, {
    debugMode: props.debugMode,
    backend: reactDndHtml5Backend.HTML5Backend,
    children: jsxRuntime.jsx(SortableTreeWithoutDndContext, {
      ...props
    })
  });
};

exports.SortableTreeWithoutDndContext = SortableTreeWithoutDndContext;
exports.addNodeUnderParent = addNodeUnderParent;
exports.changeNodeAtPath = changeNodeAtPath;
exports.default = SortableTree;
exports.defaultGetNodeKey = defaultGetNodeKey;
exports.defaultSearchMethod = defaultSearchMethod;
exports.find = find;
exports.getDepth = getDepth;
exports.getDescendantCount = getDescendantCount;
exports.getFlatDataFromTree = getFlatDataFromTree;
exports.getNodeAtPath = getNodeAtPath;
exports.getTreeFromFlatData = getTreeFromFlatData;
exports.getVisibleNodeCount = getVisibleNodeCount;
exports.getVisibleNodeInfoAtIndex = getVisibleNodeInfoAtIndex;
exports.insertNode = insertNode;
exports.isDescendant = isDescendant;
exports.map = map;
exports.removeNode = removeNode;
exports.removeNodeAtPath = removeNodeAtPath;
exports.toggleExpandedForAll = toggleExpandedForAll;
exports.walk = walk;
