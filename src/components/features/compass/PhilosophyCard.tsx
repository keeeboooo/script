"use client";

import { motion } from "framer-motion";
import { BookOpen, Heart, Lightbulb, Compass, ArrowRight } from "lucide-react";
import type { Philosophy } from "@/hooks/useCompass";
import { springTransition } from "@/lib/motion";

interface PhilosophyCardProps {
  philosophy: Philosophy;
  onCreateRoadmap?: () => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: springTransition },
};

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: springTransition },
};

export function PhilosophyCard({ philosophy, onCreateRoadmap }: PhilosophyCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="show"
      className="glass-compass rounded-2xl p-6 space-y-6"
    >
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-compass-subtle">
          <BookOpen className="w-5 h-5 text-compass" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{philosophy.title}</h2>
      </div>

      {/* Life Statement */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center py-4 px-6 rounded-xl bg-compass-subtle/50 border border-compass-border/50"
      >
        <p className="text-compass text-lg font-medium italic leading-relaxed">
          &ldquo;{philosophy.lifeStatement}&rdquo;
        </p>
      </motion.div>

      {/* Values */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Heart className="w-4 h-4 text-compass" />
          大切にしている価値観
        </div>
        <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
          {philosophy.values.map((value) => (
            <motion.div
              key={value.name}
              variants={itemVariants}
              className="glass rounded-xl p-4 space-y-1"
            >
              <h4 className="font-semibold text-sm">{value.name}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
              <p className="text-xs text-compass/60 italic">{value.origin}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Beliefs */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Lightbulb className="w-4 h-4 text-compass" />
          信念
        </div>
        <motion.ul variants={listVariants} initial="hidden" animate="show" className="space-y-2">
          {philosophy.beliefs.map((belief) => (
            <motion.li
              key={belief}
              variants={itemVariants}
              className="text-sm text-foreground/80 pl-4 border-l-2 border-compass/30 py-1"
            >
              {belief}
            </motion.li>
          ))}
        </motion.ul>
      </div>

      {/* Action Principles */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Compass className="w-4 h-4 text-compass" />
          行動指針
        </div>
        <motion.ul variants={listVariants} initial="hidden" animate="show" className="space-y-2">
          {philosophy.actionPrinciples.map((principle) => (
            <motion.li
              key={principle}
              variants={itemVariants}
              className="flex items-start gap-2 text-sm"
            >
              <span className="text-compass mt-0.5">→</span>
              <span className="text-foreground/80">{principle}</span>
            </motion.li>
          ))}
        </motion.ul>
      </div>

      {/* CTA: Create Roadmap */}
      {onCreateRoadmap && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.3 }}
          className="pt-2 border-t border-compass-border/30"
        >
          <motion.button
            onClick={onCreateRoadmap}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={springTransition}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl glass-compass border border-compass-border/50 text-compass text-sm font-medium hover:glass-compass-hover transition-colors"
          >
            この哲学をもとにロードマップを作る
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}
