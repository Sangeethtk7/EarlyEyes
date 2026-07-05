import { motion } from "framer-motion";

/**
 * Premium loading skeleton component to display during data-fetching transitions.
 */
export const PageLoader = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-7xl mx-auto p-6 space-y-6"
    >
      {/* Page Title skeleton */}
      <div className="h-10 bg-gray-200 rounded-md w-1/3 animate-pulse" />

      {/* Metric Cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 bg-gray-100 rounded-2xl p-6 space-y-4 animate-pulse border border-gray-200/50"
          >
            <div className="h-6 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
          </div>
        ))}
      </div>

      {/* Large Content Card skeleton */}
      <div className="h-80 bg-gray-100 rounded-2xl p-6 space-y-6 animate-pulse border border-gray-200/50">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-11/12" />
          <div className="h-4 bg-gray-200 rounded w-4/5" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    </motion.div>
  );
};

export default PageLoader;
