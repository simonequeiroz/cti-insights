<script setup>
import Header from '../components/Header.vue'
import Hero from '../components/Hero.vue'
import RevenueChart from '../components/RevenueChart.vue'
import Metrics from '../components/Metrics.vue'
import Architecture from '../components/Architecture.vue'
import CTA from '../components/CTA.vue'
import Footer from '../components/Footer.vue'
</script>

<template>
  <div class="min-h-screen bg-[#FAFAF7] bg-[linear-gradient(to_right,#CDDADF_1px,transparent_1px),linear-gradient(to_bottom,#CDDADF_1px,transparent_1px)] bg-[size:40px_40px] text-[#292930] flex flex-col font-['Inter',sans-serif]">
    
    <!-- Header -->
    <Header />

    <!-- Conteúdo principal -->
    <main class="flex-1">
      <Hero />
      <RevenueChart />
      <Metrics />
      <Architecture />
      <CTA />
    </main>

    <!-- Footer -->
    <Footer />

  </div>
</template>