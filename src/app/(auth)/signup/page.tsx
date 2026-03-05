"use client";

import { SignUp } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Shield, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className='min-h-screen flex bg-slate-50 dark:bg-slate-950'>
      {/* Left Panel - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className='hidden lg:flex lg:w-1/2 relative overflow-hidden'
      >
        {/* Gradient Background */}
        <div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800' />

        {/* Abstract Shapes */}
        <div className='absolute inset-0 overflow-hidden'>
          <div className='absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl' />
          <div className='absolute top-1/2 -left-20 w-60 h-60 bg-blue-400/20 rounded-full blur-3xl' />
          <div className='absolute -bottom-20 right-1/4 w-72 h-72 bg-indigo-400/15 rounded-full blur-3xl' />
        </div>

        {/* Content */}
        <div className='relative z-10 flex flex-col justify-between p-12 w-full'>
          {/* Logo & Headline */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className='flex items-center gap-3 mb-16'
            >
              <div className='w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center'>
                <TrendingUp className='w-6 h-6 text-white' />
              </div>
              <span className='text-xl font-semibold text-white'>
                InvestLoop
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <h1 className='text-4xl lg:text-5xl font-bold text-white leading-tight mb-6'>
                Build smarter.
                <br />
                Scale faster.
              </h1>
              <p className='text-lg text-indigo-100/80 max-w-md leading-relaxed'>
                Track investments, manage contributions, and grow your portfolio
                with real-time insights and powerful analytics.
              </p>
            </motion.div>

            {/* Feature Pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className='flex flex-wrap gap-3 mt-8'
            >
              {[
                "Real-time tracking",
                "Smart analytics",
                "Team collaboration",
              ].map((feature, i) => (
                <span
                  key={i}
                  className='px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/90 border border-white/10'
                >
                  {feature}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className='bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10'
          >
            <p className='text-white/90 mb-4 leading-relaxed'>
              &ldquo;InvestLoop transformed how we manage our investment pool.
              The transparency and real-time updates keep everyone
              aligned.&rdquo;
            </p>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center'>
                <Users className='w-5 h-5 text-white' />
              </div>
              <div>
                <p className='text-white font-medium text-sm'>Sarah Chen</p>
                <p className='text-indigo-200/70 text-sm'>Investment Manager</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Panel - Sign Up Form */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className='w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12'
      >
        <div className='w-full max-w-[440px]'>
          {/* Mobile Logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className='lg:hidden flex items-center justify-center gap-3 mb-8'
          >
            <div className='w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center'>
              <TrendingUp className='w-6 h-6 text-white' />
            </div>
            <span className='text-xl font-semibold text-slate-900 dark:text-white'>
              InvestLoop
            </span>
          </motion.div>

          {/* Sign Up Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className='bg-white dark:bg-slate-900/50 dark:backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50 py-4 sm:py-6 md:py-8 px-2 border border-slate-100 dark:border-slate-800'
          >
            <div className='text-center mb-4 sm:mb-6'>
              <h2 className='text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white mb-2'>
                Create your account
              </h2>
              <p className='text-sm sm:text-base text-slate-500 dark:text-slate-400'>
                Start your investment journey today
              </p>
            </div>

            <SignUp
              appearance={{
                elements: {
                  rootBox: "w-full flex justify-center",
                  card: "bg-transparent shadow-none p-4 border-none w-full max-w-full",
                  main: "w-full",
                  form: "w-full",
                  formField: "w-full",
                  formFieldInput:
                    "w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-11 focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 text-slate-900 dark:text-white placeholder:text-slate-400",
                  formButtonPrimary:
                    "w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl h-11 text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton:
                    "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 rounded-xl h-11 font-medium text-slate-700 dark:text-slate-200",
                  socialButtonsBlockButtonText: "font-medium",
                  dividerLine: "bg-slate-200 dark:bg-slate-700",
                  dividerText: "text-slate-400 dark:text-slate-500 text-sm",
                  formFieldLabel:
                    "text-slate-700 dark:text-slate-300 font-medium text-sm",
                  footerActionLink:
                    "text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium",
                  formFieldInputShowPasswordButton:
                    "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
                  identityPreviewEditButton:
                    "text-indigo-600 dark:text-indigo-400",
                  formFieldErrorText: "text-red-500 text-sm mt-1",
                  alert: "rounded-xl",
                  alertText: "text-sm",
                  footer: "hidden",
                },
                layout: {
                  socialButtonsPlacement: "top",
                  socialButtonsVariant: "blockButton",
                },
              }}
              routing='path'
              path='/signup'
              signInUrl='/login'
              redirectUrl='/dashboard'
            />

            {/* Already have account */}
            <div className='mt-4 sm:mt-6 text-center'>
              <p className='text-sm text-slate-500 dark:text-slate-400'>
                Already have an account?{" "}
                <Link
                  href='/login'
                  className='text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors'
                >
                  Sign in
                </Link>
              </p>
            </div>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className='mt-6 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500'
          >
            <Shield className='w-4 h-4' />
            <span className='text-sm'>Secure & encrypted</span>
          </motion.div>

          {/* Legal Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className='mt-4 flex items-center justify-center gap-4 text-sm'
          >
            <Link
              href='/privacy'
              className='text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors'
            >
              Privacy Policy
            </Link>
            <span className='text-slate-300 dark:text-slate-700'>•</span>
            <Link
              href='/terms'
              className='text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors'
            >
              Terms of Service
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
